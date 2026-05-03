import { watch, ref, type Ref } from "vue";
import type { LocalId } from "@planarally/mod-api";
import type { CharSheetData, RecordItem } from "../data";
import { defaultCharSheetData } from "../data";
import { api } from "../main";
import { SyncManager } from "../managers/SyncManager";
import levelConfig from "../configs/level_config.json";

/**
 * 为 RecordItem 列表中缺少 id 的项目生成唯一标识
 */
function ensureRecordIds(items: RecordItem[]): RecordItem[] {
    return items.map(item => {
        if (!item.id) {
            return {
                ...item,
                id: typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : Math.random().toString(36).substring(2, 15),
                hasTracker: item.hasTracker ?? false,
            };
        }
        return item;
    });
}

/**
 * 反序列化 CharSheetData，处理向后兼容迁移。
 * 1. 技能字段从中文 key 迁移到英文 key
 * 2. 旧版顶层 features/feats/otherProficiencies 迁移至 records 下
 * 3. 为没有 id 的 RecordItem 生成唯一 id
 * 4. trackerMappings.features 迁移至 trackerMappings.records
 */
function deserializeCharSheetData(s: Record<string, unknown>): CharSheetData {
    const d = defaultCharSheetData();
    if (!s) return d;

    // 技能数据后向兼容迁移 (中文 -> 英文 Key)
    const chineseToEnglish: Record<string, string> = {
        "运动": "athletics", "体操": "acrobatics", "巧手": "sleightOfHand", "隐匿": "stealth",
        "奥秘": "arcana", "历史": "history", "调查": "investigation", "自然": "nature", "宗教": "religion",
        "驯养": "animalHandling", "洞悉": "insight", "医疗": "medicine", "察觉": "perception", "生存": "survival",
        "欺瞒": "deception", "威吓": "intimidation", "表演": "performance", "游说": "persuasion"
    };

    let loadedSkills = s.skills ? [...(s.skills as any[])] : d.skills;
    loadedSkills = loadedSkills.map(skill => {
        if (skill.name && chineseToEnglish[skill.name]) {
            return { ...skill, name: chineseToEnglish[skill.name] };
        }
        return skill;
    });

    // 处理 records 结构迁移：兼容旧版顶层 features/feats/otherProficiencies
    let records: CharSheetData["records"];
    if (s.records && typeof s.records === "object" && !Array.isArray(s.records)) {
        // 新版结构
        const r = s.records as any;
        records = {
            features: ensureRecordIds(Array.isArray(r.features) ? [...r.features] : []),
            feats: ensureRecordIds(Array.isArray(r.feats) ? [...r.feats] : []),
            otherProficiencies: ensureRecordIds(Array.isArray(r.otherProficiencies) ? [...r.otherProficiencies] : []),
        };
    } else {
        // 旧版结构：从顶层字段迁移
        records = {
            features: ensureRecordIds(Array.isArray(s.features) ? [...(s.features as any[])] : []),
            feats: ensureRecordIds(Array.isArray(s.feats) ? [...(s.feats as any[])] : []),
            otherProficiencies: ensureRecordIds(Array.isArray(s.otherProficiencies) ? [...(s.otherProficiencies as any[])] : []),
        };
    }

    // 处理 trackerMappings 迁移：旧版 features 字段迁移至 records
    let trackerMappings = { ...d.trackerMappings };
    if (s.trackerMappings && typeof s.trackerMappings === "object") {
        const tm = s.trackerMappings as any;
        trackerMappings = {
            hp: tm.hp ?? null,
            ac: tm.ac ?? null,
            records: { ...(tm.records || tm.features || {}) },
            classes: { ...(tm.classes || {}) }
        };
    }

    // 处理 classes 迁移：旧版单调的 level 迁移为单个职业
    let classes = s.classes ? [...(s.classes as any[])] : d.classes;
    if (classes.length === 0 && typeof s.level === "number" && s.level > 0) {
        const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        classes.push({
            id,
            name: "未命名",
            level: s.level,
            hitDice: "d8",
            hitDiceCurrent: s.level
        });
    } else {
        classes = classes.map(c => ({
            ...c,
            id: c.id || (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15))
        }));
    }

    return {
        ...d,
        ...s,
        hp: s.hp ? { ...d.hp, ...(s.hp as any) } : d.hp,
        stats: s.stats ? { ...d.stats, ...(s.stats as any) } : d.stats,
        saveProficiencies: s.saveProficiencies ? { ...d.saveProficiencies, ...(s.saveProficiencies as any) } : d.saveProficiencies,
        skills: loadedSkills,
        records,
        classes,
        exp: s.exp ?? d.exp,
        speed: s.speed ?? d.speed,
        conditions: Array.isArray(s.conditions) ? [...s.conditions] : [],
        equipment: s.equipment ? {
            items: (s.equipment as any).items || [],
            mainHandId: (s.equipment as any).mainHandId || null,
            offHandId: (s.equipment as any).offHandId || null
        } : d.equipment,
        trackerMappings,
    } as CharSheetData;
}

/**
 * 封装角色卡的数据加载、保存、同步等核心逻辑。
 * 将 CharTab.vue 中对 useShapeDataBlock 的直接调用和 shape 切换监听提取到此处。
 */
export function useCharSheetData() {
    const { data, load, save } = api.useShapeDataBlock<Record<string, unknown>, CharSheetData>(
        "char-sheet",
        {
            defaultData: defaultCharSheetData,
            serializer: {
                serialize: (d) => d as unknown as Record<string, unknown>,
                deserialize: deserializeCharSheetData,
            },
        },
    );

    // 记录当前正在加载的 shapeId
    const currentShapeId = ref<LocalId | undefined>();

    // 防止循环更新的标志
    let skipNextSync = false;

    // 监听当前选中的 shape
    watch(
        () => {
            const focus = api.systemsState.selected.reactive.focus;
            if (focus) return focus;

            const charId = api.systemsState.characters.reactive.activeCharacterId;
            if (charId) {
                const shape = api.systems.characters.getShape(charId);
                if (shape) return shape.id;
            }
            return undefined;
        },
        (shapeId) => {
            if (shapeId) {
                currentShapeId.value = shapeId;
                load(shapeId);
            } else {
                currentShapeId.value = undefined;
            }
        },
        { immediate: true },
    );

    // 监听由外部 Tracker 更改触发的重载信号
    watch(SyncManager.forceReload, () => {
        skipNextSync = true;
        refreshFromDataBlock();
    });

    /**
     * 从底层 DataBlock 刷新响应式 data 的数值字段。
     * 用于外部 Tracker 变更后同步回 UI。
     */
    function refreshFromDataBlock() {
        if (currentShapeId.value === undefined) return;
        const globalId = api.getGlobalId(currentShapeId.value);
        if (!globalId) return;

        const db = api.getDataBlock<Record<string, unknown>, CharSheetData>({
            category: "shape",
            shape: globalId,
            name: "char-sheet"
        });
        if (!db) return;

        // 同步所有可能被外部 Tracker 修改的字段
        data.value.hp.current = db.data.hp.current;
        data.value.hp.max = db.data.hp.max;
        data.value.hp.temp = db.data.hp.temp;
        data.value.ac = db.data.ac;


        // 同步 records 中有 tracker 绑定的项目的 uses 数据
        for (const category of ["features", "feats", "otherProficiencies"] as const) {
            const dbRecords = db.data.records[category];
            const localRecords = data.value.records[category];
            for (let i = 0; i < localRecords.length; i++) {
                const dbItem = dbRecords.find(r => r.id === localRecords[i].id);
                if (dbItem?.uses && localRecords[i].hasTracker) {
                    localRecords[i].uses = { ...dbItem.uses };
                }
            }
        }

        // 同步 classes 的 hitDiceCurrent
        const dbClasses = db.data.classes;
        const localClasses = data.value.classes;
        for (let i = 0; i < localClasses.length; i++) {
            const dbClass = dbClasses.find(c => c.id === localClasses[i].id);
            if (dbClass && dbClass.hitDiceCurrent !== undefined) {
                localClasses[i].hitDiceCurrent = dbClass.hitDiceCurrent;
            }
        }
    }

    // 监听职业数据变化，自动计算总等级和熟练加值
    watch(() => data.value.classes, () => {
        let totalLevel = 0;
        for (const cls of data.value.classes) {
            totalLevel += cls.level;
        }
        if (data.value.level !== totalLevel) {
            data.value.level = totalLevel;
        }

        const configEntry = levelConfig.proficiencyBonus.find(c => totalLevel >= c.minLevel && totalLevel <= c.maxLevel);
        const newPb = configEntry ? configEntry.bonus : (totalLevel > 0 ? 2 + Math.floor((totalLevel - 1) / 4) : 2);
        if (data.value.proficiencyBonus !== newPb) {
            data.value.proficiencyBonus = newPb;
        }
    }, { deep: true, immediate: true });

    // 监听数据变化进行保存和外部同步
    watch(data, () => {
        save();
        if (skipNextSync) {
            skipNextSync = false;
            return;
        }
        if (currentShapeId.value !== undefined) {
            SyncManager.syncToExternalSystems(currentShapeId.value, data.value);
        }
    }, { deep: true });

    /**
     * 添加一个新的记录项到指定分类
     */
    function addRecordItem(category: "features" | "feats" | "otherProficiencies", name: string, description: string) {
        const id = typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15);
        data.value.records[category].push({ id, name, description, hasTracker: false });
        save();
    }

    /**
     * 删除指定分类中的记录项，同时清理对应的 tracker 映射
     */
    function removeRecordItem(category: "features" | "feats" | "otherProficiencies", index: number) {
        const item = data.value.records[category][index];
        if (item) {
            // 清理 tracker 映射
            delete data.value.trackerMappings.records[item.id];
        }
        data.value.records[category].splice(index, 1);
        save();
    }

    return {
        data,
        save,
        currentShapeId,
        addRecordItem,
        removeRecordItem,
    };
}
