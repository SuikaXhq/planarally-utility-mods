import type { GameApi, LocalId, Tracker, Sync } from "@planarally/mod-api";
import type { CharSheetData, RecordItem } from "../data";
import { getModifier } from "../data";

export class SyncManager {
    private static api: GameApi;
    private static t: (key: string) => string;

    public static init(api: GameApi, t: (key: string) => string) {
        this.api = api;
        this.t = t;
    }

    public static setupEventHandlers() {
        // Handle external tracker deletion
        this.api.eventBus.on("tracker:removed", (payload) => {
            const globalId = this.api.getGlobalId(payload.id);
            if (!globalId) return;

            const db = this.api.getDataBlock<Record<string, unknown>, CharSheetData>({
                category: "shape",
                shape: globalId,
                name: "char-sheet",
            });
            if (!db) return;

            const data = db.data;
            let changed = false;

            if (data.trackerMappings.hp === payload.trackerId) {
                data.trackerMappings.hp = null;
                changed = true;
            }
            if (data.trackerMappings.ac === payload.trackerId) {
                data.trackerMappings.ac = null;
                changed = true;
            }

            for (const [classId, trackerId] of Object.entries(data.trackerMappings.classes)) {
                if (trackerId === payload.trackerId) {
                    delete data.trackerMappings.classes[classId];
                    changed = true;
                }
            }

            for (const [recordId, trackerId] of Object.entries(data.trackerMappings.records)) {
                if (trackerId === payload.trackerId) {
                    delete data.trackerMappings.records[recordId];
                    changed = true;
                }
            }

            if (changed) {
                db.updateData(data);
                db.sync();
            }
        });

        // Handle external customData updates
        this.api.eventBus.on("customData:updated", (payload) => {
            const globalId = this.api.getGlobalId(payload.id);
            if (!globalId) return;

            const elements = this.api.systems.customData.export(payload.id);
            const el = elements.find(e => e.id === payload.elementId);
            if (!el || el.source !== "advanced-char-sheet") return;

            const db = this.api.getDataBlock<Record<string, unknown>, CharSheetData>({
                category: "shape",
                shape: globalId,
                name: "char-sheet",
            });
            if (!db) return;

            const data = db.data;
            let changed = false;

            if (el.prefix === this.t("ui.stats")) {
                // Not reverse syncing stats as they are calculated modifiers
            } else if (el.prefix === this.t("ui.characterSheet")) {
                if (el.name === this.t("ui.ac") && typeof payload.delta.value === "number") {
                    if (data.ac !== payload.delta.value) {
                        data.ac = Math.max(0, payload.delta.value);
                        changed = true;
                    }
                } else if (el.name === this.t("ui.proficiencyBonus") && typeof payload.delta.value === "number") {
                    if (data.proficiencyBonus !== payload.delta.value) {
                        data.proficiencyBonus = payload.delta.value;
                        changed = true;
                    }
                }
            }

            if (changed) {
                // Also update reactive properties if they exist
                if (db.reactiveData && db.reactiveData.value) {
                    db.reactiveData.value.ac = data.ac;
                    db.reactiveData.value.proficiencyBonus = data.proficiencyBonus;
                }
                db.updateData(data);
                db.sync();
            }
        });

        this.api.eventBus.on("customData:removed", (payload) => {
            // Unidirectional sync will just recreate it next time char sheet is saved.
        });
    }


    // -------------------------------------------------------------------------
    // Generic Tracker synchronization methods
    // -------------------------------------------------------------------------

    /**
     * Synchronize a single tracker to the external system.
     * Creates the tracker if it doesn't exist, otherwise updates it.
     * Returns the final tracker UUID (used for updating mappings).
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
    // CustomData synchronization
    // -------------------------------------------------------------------------

    private static syncCustomData(localShapeId: LocalId, data: CharSheetData) {
        const globalId = this.api.getGlobalId(localShapeId);
        if (!globalId) return;

        const elements = this.api.systems.customData.export(localShapeId);

        const syncCD = (prefix: string, name: string, value: number | string) => {
            const identifier = { shapeId: globalId, source: "advanced-char-sheet", prefix, name };
            const elementId = this.api.systems.customData.getElementId(identifier);

            if (elementId !== undefined) {
                const el = elements.find(e => e.id === elementId);
                if (el && el.value !== value) {
                    this.api.systems.customData.updateValue(localShapeId, elementId, value, true);
                }
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
    // Main entry: Sync to external systems
    // -------------------------------------------------------------------------

    /**
     * Synchronize character sheet data down to external systems (CustomData & Trackers).
     */
    public static syncToExternalSystems(localShapeId: LocalId, data: CharSheetData) {
        const globalId = this.api.getGlobalId(localShapeId);
        if (!globalId) return;

            // 1. Sync CustomData (stat modifiers, proficiency bonus)
            this.syncCustomData(localShapeId, data);

            // 2. Sync static Trackers (HP, AC, HitDice)
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

            // 3. Sync items in records with trackers enabled
            // 3a. Cleanup trackers for deleted records
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

            // 3b. Sync trackers for existing records
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

            // 4. Sync hitDice for classes
            // 4a. Cleanup trackers for deleted classes
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
    }

    // -------------------------------------------------------------------------
    // Reverse synchronization: Intercept external Tracker updates
    // -------------------------------------------------------------------------

    /**
     * Intercept Tracker updates and sync back to Character DataBlock.
     */
    public static handlePreTrackerUpdate(id: LocalId, tracker: Tracker, delta: Partial<Tracker>): Partial<Tracker> {
        const globalId = this.api.getGlobalId(id);
        if (!globalId) return delta;

        const db = this.api.getDataBlock<Record<string, unknown>, CharSheetData>({
            category: "shape",
            shape: globalId,
            name: "char-sheet",
        });

        if (!db) return delta;

        // 直接使用响应式代理对象（如果存在），这允许我们原地修改并自动触发 UI 渲染
        // 完全避免了昂贵的 JSON.parse(JSON.stringify(data)) 深拷贝操作
        const targetData = (db.reactiveData && db.reactiveData.value) ? db.reactiveData.value : db.data;
        const finalDelta = { ...delta };
        let dataChanged = false;

        const newValue = delta.value !== undefined ? delta.value : tracker.value;

        // 识别是哪个 Tracker
        const isHp = targetData.trackerMappings.hp === tracker.uuid || tracker.name === this.t("ui.hp");
        const isAc = targetData.trackerMappings.ac === tracker.uuid || tracker.name === this.t("ui.ac");

        if (isHp) {
            // 1. 同步 Max HP
            if (delta.maxvalue !== undefined && delta.maxvalue !== targetData.hp.max) {
                targetData.hp.max = Math.max(1, delta.maxvalue);
                dataChanged = true;
            }

            // 2. 强制 Current HP 不超过 Max HP
            if (targetData.hp.current > targetData.hp.max) {
                targetData.hp.current = targetData.hp.max;
                dataChanged = true;
            }

            // 3. 处理 Tracker 数值变更
            const oldTotal = targetData.hp.current + targetData.hp.temp;
            if (newValue !== oldTotal) {
                const diff = newValue - oldTotal;
                if (diff < 0) {
                    const tempReduction = Math.min(targetData.hp.temp, -diff);
                    targetData.hp.temp -= tempReduction;
                    targetData.hp.current = Math.max(0, targetData.hp.current - (-diff - tempReduction));
                } else {
                    targetData.hp.current = Math.min(targetData.hp.max, targetData.hp.current + diff);
                }
                dataChanged = true;
            }

            finalDelta.value = targetData.hp.current + targetData.hp.temp;
            finalDelta.maxvalue = targetData.hp.max;
            if (targetData.trackerMappings.hp !== tracker.uuid) {
                targetData.trackerMappings.hp = tracker.uuid;
                dataChanged = true;
            }
        } else if (isAc) {
            if (newValue !== targetData.ac) {
                targetData.ac = Math.max(0, newValue);
                dataChanged = true;
            }
            finalDelta.value = targetData.ac;
            if (targetData.trackerMappings.ac !== tracker.uuid) {
                targetData.trackerMappings.ac = tracker.uuid;
                dataChanged = true;
            }
        } else {
            // Check if it's a tracker for an item in records
            const result = this.findRecordItemByTrackerUuid(targetData, tracker.uuid as string);
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
                // Check if it's a hitDice tracker for a class
                const classItem = targetData.classes.find(c => targetData.trackerMappings.classes[c.id] === tracker.uuid);
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
            // Because we mutated targetData (which is likely the Vue reactive proxy),
            // Vue automatically detects the changes. We just need to persist it.
            db.updateData(db.data);
            db.sync();
        }

        return finalDelta;
    }

    /**
     * Find a RecordItem bound to the specified tracker UUID across all record categories.
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
