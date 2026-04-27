<script setup lang="ts">
import { Button, Table, TagInput } from "@planarally-mods/ui";
import VitalStatusBlock from "./VitalStatusBlock.vue";
import FeatureItem from "./FeatureItem.vue";
import { watch, ref } from "vue";
import { api } from "./main";
import { ToolName } from "@planarally/mod-api";
import type { LocalId } from "@planarally/mod-api";
import type { CharSheetData } from "./data";
import { defaultCharSheetData, getModifier } from "./data";
import StatsBlock from "./StatsBlock.vue";
import SkillsBlock from "./SkillsBlock.vue";
import EquipmentBlock from "./EquipmentBlock.vue";
import { useI18n } from "./utils/i18n";

// --- DataBlock 初始化 ---
const { t } = useI18n();
const { data, load, save } = api.useShapeDataBlock<Record<string, unknown>, CharSheetData>(
    "char-sheet",
    {
        defaultData: defaultCharSheetData,
        serializer: {
            serialize: (d) => d as unknown as Record<string, unknown>,
            deserialize: (s) => {
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

                return {
                    ...d,
                    ...s,
                    hp: s.hp ? { ...d.hp, ...(s.hp as any) } : d.hp,
                    hitDice: s.hitDice ? { ...d.hitDice, ...(s.hitDice as any) } : d.hitDice,
                    stats: s.stats ? { ...d.stats, ...(s.stats as any) } : d.stats,
                    saveProficiencies: s.saveProficiencies ? { ...d.saveProficiencies, ...(s.saveProficiencies as any) } : d.saveProficiencies,
                    skills: loadedSkills,
                    features: Array.isArray(s.features) ? [...s.features] : [],
                    feats: Array.isArray(s.feats) ? [...s.feats] : [],
                    conditions: Array.isArray(s.conditions) ? [...s.conditions] : [],
                    equipment: s.equipment ? {
                        items: (s.equipment as any).items || [],
                        mainHandId: (s.equipment as any).mainHandId || null,
                        offHandId: (s.equipment as any).offHandId || null
                    } : d.equipment,
                } as CharSheetData;
            },
        },
    },
);

// 记录当前正在加载的 shapeId，用于防止数据同步冲突
const currentShapeId = ref<LocalId | undefined>();

// 监听当前选中的 shape（在属性面板中即为 focus shape），或者退回到 activeCharacterId
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

// --- 外部系统同步 (CustomData & Trackers) ---
function syncToExternalSystems() {
    if (currentShapeId.value === undefined) return;

    const localShapeId = currentShapeId.value;
    const globalId = api.getGlobalId(localShapeId);
    if (!globalId) return;

    // 1. 同步到 CustomData
    const syncCD = (prefix: string, name: string, value: number | string) => {
        const identifier = { shapeId: globalId, source: "advanced-char-sheet", prefix, name };
        const elementId = api.systems.customData.getElementId(identifier);

        if (elementId !== undefined) {
            api.systems.customData.updateValue(localShapeId, elementId, value, true);
        } else {
            api.systems.customData.addElement({
                ...identifier,
                kind: typeof value === "number" ? "number" : "text",
                value: value as any,
                reference: null,
                description: null
            }, true);
        }
    };

    // 属性调整值
    const statKeys = ["str", "dex", "con", "int", "wis", "cha"] as const;
    for (const stat of statKeys) {
        syncCD(t("ui.stats"), stat.toUpperCase(), getModifier(data.value.stats[stat]));
    }
    // 熟练加值
    syncCD(t("ui.characterSheet"), t("ui.proficiencyBonus"), data.value.proficiencyBonus);


    // 2. 同步到 Trackers
    const syncTracker = (name: string, value: number, maxvalue: number, color: string) => {
        const trackers = api.systems.trackers.getAll(localShapeId);
        const tracker = trackers.find((t: any) => t.name === name);
        const sync: any = { ui: true, server: true };
        if (tracker) {
            api.systems.trackers.update(localShapeId, tracker.uuid, { value, maxvalue }, sync);
        } else {
            api.systems.trackers.add(localShapeId, {
                uuid: (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)) as any,
                name,
                value,
                maxvalue,
                visible: true,
                draw: true,
                primaryColor: color,
                secondaryColor: "#ffffff"
            }, sync);
        }
    };

    // 体力 (HP)
    syncTracker(t("ui.hp"), data.value.hp.current + data.value.hp.temp, data.value.hp.max, "#ff0000");

    // AC
    syncTracker(t("ui.ac"), data.value.ac, 30, "#0000ff");

    // 生命骰 (Hit Dice)
    syncTracker(t("ui.hitDice"), data.value.hitDice.current, data.value.hitDice.max, "#00ff00");
}

// 监听数据变化进行同步
watch(data, () => {
    syncToExternalSystems();
}, { deep: true });

async function handleRoll(expr: string) {
    if (!api.systems.dice.isLoaded) await api.systems.dice.loadSystems();
    // 激活骰子工具
    api.ui.activateTool(ToolName.Dice);
    // 等待骰子工具初始化完成
    await new Promise((resolve) => setTimeout(resolve, 100));
    api.systems.dice.setInput(expr);
}

function addRecordItem(list: "features" | "feats" | "otherProficiencies") {
    data.value[list].push({ name: t("ui.name"), description: t("ui.description") });
    save();
}

function removeRecordItem(list: "features" | "feats" | "otherProficiencies", index: number) {
    data.value[list].splice(index, 1);
    save();
}
</script>

<template>
    <div class="adv-char-sheet">
        <!-- 基础信息与属性模块，60%和40%布局 -->
        <div class="top-section">
            <div class="stats-wrapper">
                <StatsBlock v-model="data.stats" v-model:saves="data.saveProficiencies" :proficiency-bonus="data.proficiencyBonus" @roll="handleRoll" @update:modelValue="save" @update:saves="save" />
            </div>
            
            <div class="vital-info-wrapper">
                <VitalStatusBlock v-model:hp="data.hp" v-model:ac="data.ac" v-model:conditions="data.conditions" @change="save" />
            </div>
        </div>

        <!-- 主要内容区域：技能与装备并排 -->
        <div class="main-content-grid">
            <!-- 技能 -->
            <SkillsBlock v-model="data.skills" :stats="data.stats" :proficiency-bonus="data.proficiencyBonus"
                @roll="handleRoll" @change="save" />

            <!-- 右侧：装备与特性 -->
            <div class="right-column">
                <!-- 装备与武器 -->
                <EquipmentBlock v-model="data.equipment" :stats="data.stats" :proficiency-bonus="data.proficiencyBonus"
                    @roll="handleRoll" @change="save" />

                <!-- 记录项：特性、专长 -->
                <div class="records-grid">
                    <section class="sheet-section">
                        <div class="section-header">
                            <h3 class="section-title">{{ t("ui.features") }}</h3>
                            <Button size="small" @click="addRecordItem('features')">+</Button>
                        </div>
                        <div class="record-list">
                            <FeatureItem 
                                v-for="(item, i) in data.features" 
                                :key="`feature-${i}`" 
                                v-model="data.features[i]" 
                                @change="save" 
                                @remove="removeRecordItem('features', i)" 
                            />
                        </div>
                    </section>

                    <section class="sheet-section">
                        <div class="section-header">
                            <h3 class="section-title">{{ t("ui.feats") }}</h3>
                            <Button size="small" @click="addRecordItem('feats')">+</Button>
                        </div>
                        <div class="record-list">
                            <FeatureItem 
                                v-for="(item, i) in data.feats" 
                                :key="`feat-${i}`" 
                                v-model="data.feats[i]" 
                                @change="save" 
                                @remove="removeRecordItem('feats', i)" 
                            />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.adv-char-sheet {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: #f5f5f5;
    height: 100%;
    max-height: 80vh;
    overflow-y: auto;
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
}

.top-section {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: stretch;
}

.stats-wrapper {
    width: 100%;
}

.stats-wrapper :deep(.stats-block) {
    height: 100%;
    margin-bottom: 0;
}

.stats-wrapper :deep(.pa-ui-table-wrapper),
.stats-wrapper :deep(.pa-ui-table) {
    height: 100%;
}

.top-section :deep(.pa-ui-table thead th) {
    padding: 8px 4px !important;
    font-size: 1rem !important;
    line-height: 1.5 !important;
    white-space: nowrap;
}

.top-section :deep(.pa-ui-table thead) {
    height: 1px;
}

.vital-info-wrapper {
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100%;
}

.vital-input:hover,
.vital-input:focus {
    border-color: #aaa;
    background-color: #f5f5f5;
    outline: none;
}

.vital-input::-webkit-outer-spin-button,
.vital-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.main-content-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: start;
}

.right-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.adv-char-sheet .sheet-section {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
    width: 100%;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.section-title {
    margin: 0;
    color: #2c3e50;
    font-size: 1.1rem;
    font-weight: bold;
    border-left: 4px solid #ff7052;
    padding-left: 0.5rem;
}



/* 记录项：特性、专长并排 */
.records-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

.record-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>
