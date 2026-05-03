import { ref } from "vue";
import type { GameApi, LocalId, Tracker, Sync } from "@planarally/mod-api";
import type { CharSheetData, RecordItem } from "../data";
import { getModifier } from "../data";

export class SyncManager {
    private static api: GameApi;
    private static t: (key: string) => string;

    /** 响应式信号：外部 Tracker 变更后递增，通知 UI 刷新 */
    public static forceReload = ref(0);

    /** 防止循环更新的标志位 */
    private static isInternalUpdate = false;

    /** 记录上一次同步的核心数据快照，用于断开递归更新 */
    private static lastSyncDataJson = "";

    public static init(api: GameApi, t: (key: string) => string) {
        this.api = api;
        this.t = t;
    }

    // -------------------------------------------------------------------------
    // 通用 Tracker 同步方法
    // -------------------------------------------------------------------------

    /**
     * 同步单个 tracker 至外部系统。如果 tracker 不存在则创建，已存在则更新。
     * 返回最终的 tracker UUID（用于更新 mapping）。
     */
    private static syncSingleTracker(
        localShapeId: LocalId,
        trackers: readonly Tracker[],
        currentUuid: string | null,
        name: string,
        value: number,
        maxvalue: number,
        color: string,
        draw: boolean = false,
    ): string {
        const sync: Sync = { ui: true, server: true };

        // 先按 UUID 查找
        let tracker = currentUuid ? trackers.find((t) => t.uuid === currentUuid) : undefined;

        // 后向兼容：按名字查找
        if (!tracker) {
            tracker = trackers.find((t) => t.name === name);
        }

        if (tracker) {
            const delta: Partial<Tracker> = {};
            if (tracker.value !== value) delta.value = value;
            if (tracker.maxvalue !== maxvalue) delta.maxvalue = maxvalue;
            if (tracker.name !== name) delta.name = name;
            if (Object.keys(delta).length > 0) {
                this.api.systems.trackers.update(localShapeId, tracker.uuid, delta, sync);
            }
            return tracker.uuid as string;
        }

        // 创建新 tracker
        const newUuid = typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15);

        this.api.systems.trackers.add(localShapeId, {
            uuid: newUuid as any,
            name,
            value,
            maxvalue,
            visible: true,
            draw: draw,
            primaryColor: color,
            secondaryColor: "rgba(136, 136, 136, 1)",
        }, sync);

        return newUuid;
    }

    // -------------------------------------------------------------------------
    // CustomData 同步
    // -------------------------------------------------------------------------

    private static syncCustomData(localShapeId: LocalId, data: CharSheetData) {
        const globalId = this.api.getGlobalId(localShapeId);
        if (!globalId) return;

        const syncCD = (prefix: string, name: string, value: number | string) => {
            const identifier = { shapeId: globalId, source: "advanced-char-sheet", prefix, name };
            const elementId = this.api.systems.customData.getElementId(identifier);

            if (elementId !== undefined) {
                this.api.systems.customData.updateValue(localShapeId, elementId, value, true);
            } else {
                this.api.systems.customData.addElement({
                    ...identifier,
                    kind: typeof value === "number" ? "number" : "text",
                    value: value as any,
                    reference: null,
                    description: null,
                }, true);
            }
        };

        const statKeys = ["str", "dex", "con", "int", "wis", "cha"] as const;
        for (const stat of statKeys) {
            syncCD(this.t("ui.stats"), stat.toUpperCase(), getModifier(data.stats[stat]));
        }
        syncCD(this.t("ui.characterSheet"), this.t("ui.proficiencyBonus"), data.proficiencyBonus);
        syncCD(this.t("ui.characterSheet"), this.t("ui.ac"), data.ac);
    }

    // -------------------------------------------------------------------------
    // 主入口：同步到外部系统
    // -------------------------------------------------------------------------

    /**
     * 将角色卡的数据下发同步至外部系统 (CustomData & Trackers)
     */
    public static syncToExternalSystems(localShapeId: LocalId, data: CharSheetData) {
        if (this.isInternalUpdate) return;

        // 仅在核心数据发生变化时才同步到外部系统，防止因 trackerMappings 更新导致的循环
        const syncDataSnapshot = JSON.stringify({
            hp: data.hp,
            ac: data.ac,
            stats: data.stats,
            pb: data.proficiencyBonus,
            classes: data.classes.map(c => ({ id: c.id, level: c.level, name: c.name, hitDiceCurrent: c.hitDiceCurrent })),
            records: data.records,
        });
        if (syncDataSnapshot === this.lastSyncDataJson) return;
        this.lastSyncDataJson = syncDataSnapshot;

        this.isInternalUpdate = true;
        try {
            const globalId = this.api.getGlobalId(localShapeId);
            if (!globalId) return;

            // 1. 同步 CustomData（属性调整值、熟练加值）
            this.syncCustomData(localShapeId, data);

            // 2. 同步固定 Trackers (HP, AC, HitDice)
            const trackers = this.api.systems.trackers.getAll(localShapeId);

            const hpUuid = this.syncSingleTracker(
                localShapeId, trackers, data.trackerMappings.hp,
                this.t("ui.hp"), data.hp.current + data.hp.temp, data.hp.max, "#0dff00ff", true
            );
            if (data.trackerMappings.hp !== hpUuid) data.trackerMappings.hp = hpUuid;

            const acUuid = this.syncSingleTracker(
                localShapeId, trackers, data.trackerMappings.ac,
                this.t("ui.ac"), data.ac, 0, "#0000ff",
            );
            if (data.trackerMappings.ac !== acUuid) data.trackerMappings.ac = acUuid;

            // 3. 同步 records 中启用了 tracker 的项目
            // 3a. 清理已删除 record 对应的 tracker
            const currentRecordIds = new Set<string>();
            for (const category of ["features", "feats", "otherProficiencies"] as const) {
                for (const item of data.records[category]) {
                    currentRecordIds.add(item.id);
                }
            }
            for (const [recordId, trackerId] of Object.entries(data.trackerMappings.records)) {
                if (!currentRecordIds.has(recordId)) {
                    if (trackerId) {
                        const exists = trackers.some(t => t.uuid === trackerId);
                        if (exists) {
                            this.api.systems.trackers.remove(localShapeId, trackerId as any, { ui: true, server: true });
                        }
                    }
                    delete data.trackerMappings.records[recordId];
                }
            }

            // 3b. 同步现有 record 的 tracker
            for (const category of ["features", "feats", "otherProficiencies"] as const) {
                for (const item of data.records[category]) {
                    if (item.hasTracker && item.uses) {
                        const uuid = this.syncSingleTracker(
                            localShapeId, trackers, data.trackerMappings.records[item.id] ?? null,
                            item.trackerName || item.name, item.uses.current, item.uses.max, "#ff9800",
                        );
                        if (data.trackerMappings.records[item.id] !== uuid) {
                            data.trackerMappings.records[item.id] = uuid;
                        }
                    } else {
                        // 如果关闭了 tracker，清理映射并删除服务端 tracker
                        if (data.trackerMappings.records[item.id]) {
                            const trackerId = data.trackerMappings.records[item.id];
                            const exists = trackers.some(t => t.uuid === trackerId);
                            if (exists) {
                                this.api.systems.trackers.remove(localShapeId, trackerId as any, { ui: true, server: true });
                            }
                            delete data.trackerMappings.records[item.id];
                        }
                    }
                }
            }

            // 4. 同步 classes 的 hitDice
            // 4a. 清理已删除职业对应的 tracker
            const currentClassIds = new Set(data.classes.map(c => c.id));
            for (const [classId, trackerId] of Object.entries(data.trackerMappings.classes)) {
                if (!currentClassIds.has(classId)) {
                    if (trackerId) {
                        // 仅当该 tracker 确实存在于当前 shape 的 tracker 列表中时才调用 remove
                        const exists = trackers.some(t => t.uuid === trackerId);
                        if (exists) {
                            this.api.systems.trackers.remove(localShapeId, trackerId as any, { ui: true, server: true });
                        }
                    }
                    delete data.trackerMappings.classes[classId];
                }
            }

            for (const cls of data.classes) {
                if (cls.level > 0) {
                    const uuid = this.syncSingleTracker(
                        localShapeId, trackers, data.trackerMappings.classes[cls.id] ?? null,
                        `${this.t("ui.hitDice")}（${cls.name}）`, cls.hitDiceCurrent, cls.level, "#4caf50",
                    );
                    if (data.trackerMappings.classes[cls.id] !== uuid) {
                        data.trackerMappings.classes[cls.id] = uuid;
                    }
                }
            }
        } finally {
            this.isInternalUpdate = false;
        }
    }

    // -------------------------------------------------------------------------
    // 反向同步：拦截外部 Tracker 更新
    // -------------------------------------------------------------------------

    /**
     * 拦截 Tracker 更新并反向同步到角色卡 DataBlock
     */
    public static handlePreTrackerUpdate(id: LocalId, tracker: Tracker, delta: Partial<Tracker>): Partial<Tracker> {
        // 如果是由 syncToExternalSystems 触发的更新，直接返回 delta，不进行反向同步
        if (this.isInternalUpdate) return delta;

        const globalId = this.api.getGlobalId(id);
        if (!globalId) return delta;

        const db = this.api.getDataBlock<Record<string, unknown>, CharSheetData>({
            category: "shape",
            shape: globalId,
            name: "char-sheet",
        });

        if (!db) return delta;

        const data = db.data;
        const finalDelta = { ...delta };
        let dataChanged = false;

        const newValue = delta.value !== undefined ? delta.value : tracker.value;
        const newMax = delta.maxvalue !== undefined ? delta.maxvalue : tracker.maxvalue;

        // 识别是哪个 Tracker
        const isHp = data.trackerMappings.hp === tracker.uuid || tracker.name === this.t("ui.hp");
        const isAc = data.trackerMappings.ac === tracker.uuid || tracker.name === this.t("ui.ac");

        const clonedData = JSON.parse(JSON.stringify(data)) as CharSheetData;

        if (isHp) {
            if (delta.maxvalue !== undefined && delta.maxvalue !== clonedData.hp.max) {
                clonedData.hp.max = Math.max(1, delta.maxvalue);
                dataChanged = true;
            }
            const oldTotal = clonedData.hp.current + clonedData.hp.temp;
            if (newValue !== oldTotal) {
                const diff = newValue - oldTotal;
                if (diff < 0) {
                    const tempReduction = Math.min(clonedData.hp.temp, -diff);
                    clonedData.hp.temp -= tempReduction;
                    clonedData.hp.current = Math.max(0, clonedData.hp.current - (-diff - tempReduction));
                } else {
                    clonedData.hp.current = Math.min(clonedData.hp.max, clonedData.hp.current + diff);
                }
                dataChanged = true;
            }
            finalDelta.value = clonedData.hp.current + clonedData.hp.temp;
            finalDelta.maxvalue = clonedData.hp.max;
            if (clonedData.trackerMappings.hp !== tracker.uuid) {
                clonedData.trackerMappings.hp = tracker.uuid;
                dataChanged = true;
            }
        } else if (isAc) {
            if (newValue !== clonedData.ac) {
                clonedData.ac = Math.max(0, newValue);
                dataChanged = true;
            }
            finalDelta.value = clonedData.ac;
            if (clonedData.trackerMappings.ac !== tracker.uuid) {
                clonedData.trackerMappings.ac = tracker.uuid;
                dataChanged = true;
            }
        } else {
            // 查找是否是 records 中某个项目的 tracker
            const result = this.findRecordItemByTrackerUuid(clonedData, tracker.uuid as string);
            if (result) {
                const item = result.item;
                if (item.uses) {
                    if (delta.maxvalue !== undefined && delta.maxvalue !== item.uses.max) {
                        item.uses.max = Math.max(0, delta.maxvalue);
                        dataChanged = true;
                    }
                    const clampedVal = Math.max(0, Math.min(item.uses.max, newValue));
                    if (clampedVal !== item.uses.current) {
                        item.uses.current = clampedVal;
                        dataChanged = true;
                    }
                    finalDelta.value = item.uses.current;
                    finalDelta.maxvalue = item.uses.max;
                }
            } else {
                // 查找是否是 classes 中某个职业的 hitDice tracker
                const classItem = clonedData.classes.find(c => clonedData.trackerMappings.classes[c.id] === tracker.uuid);
                if (classItem) {
                    if (delta.maxvalue !== undefined && delta.maxvalue !== classItem.level) {
                        finalDelta.maxvalue = classItem.level; // 不允许直接通过 tracker 修改职业等级
                    }
                    const clampedVal = Math.max(0, Math.min(classItem.level, newValue));
                    if (clampedVal !== classItem.hitDiceCurrent) {
                        classItem.hitDiceCurrent = clampedVal;
                        dataChanged = true;
                    }
                    finalDelta.value = classItem.hitDiceCurrent;
                    finalDelta.maxvalue = classItem.level;
                }
            }
        }

        if (dataChanged) {
            // 响应式数据更新
            if (db.reactiveData && db.reactiveData.value) {
                db.reactiveData.value.hp = clonedData.hp;
                db.reactiveData.value.ac = clonedData.ac;
                db.reactiveData.value.trackerMappings = clonedData.trackerMappings;
                db.reactiveData.value.records = clonedData.records;
                db.reactiveData.value.classes = clonedData.classes;
            }
            
            // 更新同步快照，防止 handlePreTrackerUpdate -> DataBlock Update -> syncToExternalSystems 产生循环
            this.lastSyncDataJson = JSON.stringify({
                hp: clonedData.hp,
                ac: clonedData.ac,
                stats: clonedData.stats,
                pb: clonedData.proficiencyBonus,
                classes: clonedData.classes.map(c => ({ id: c.id, level: c.level, name: c.name, hitDiceCurrent: c.hitDiceCurrent })),
                records: clonedData.records,
            });

            db.updateData(clonedData);
            db.sync();
            this.forceReload.value++;
        }

        return finalDelta;
    }

    /**
     * 在所有 records 分类中查找绑定了指定 tracker UUID 的 RecordItem
     */
    private static findRecordItemByTrackerUuid(
        data: CharSheetData,
        trackerUuid: string,
    ): { category: string; item: RecordItem } | undefined {
        for (const category of ["features", "feats", "otherProficiencies"] as const) {
            for (const item of data.records[category]) {
                if (data.trackerMappings.records[item.id] === trackerUuid) {
                    return { category, item };
                }
            }
        }
        return undefined;
    }
}
