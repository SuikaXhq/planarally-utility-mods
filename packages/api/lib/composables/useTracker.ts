import { ref, watch, onUnmounted, type Ref } from "vue";
import type { GameApi, LocalId, Tracker } from "../main.js";
import { modEventBus } from "../eventBus.js";

export function useTracker(api: GameApi, shapeId: LocalId, trackerName: string): Ref<Tracker | undefined> {
    const trackerRef = ref<Tracker>();
    let internalCopy: Tracker | undefined;
    let isUpdatingFromPA = false;

    // 1. 初始化逻辑：寻找现有的 Tracker
    const existingTrackers = api.systems.trackers.getAll(shapeId);
    const target = existingTrackers.find(t => t.name === trackerName);
    
    if (target) {
        trackerRef.value = JSON.parse(JSON.stringify(target));
        internalCopy = JSON.parse(JSON.stringify(target));
    }

    // 2. PA -> Mod 的被动同步
    const offUpdate = modEventBus.on("tracker:updated", (payload) => {
        if (payload.id === shapeId && trackerRef.value && payload.trackerId === trackerRef.value.uuid) {
            isUpdatingFromPA = true;
            Object.assign(trackerRef.value, payload.delta);
            Object.assign(internalCopy!, payload.delta);
            isUpdatingFromPA = false;
        }
    });

    const offAdd = modEventBus.on("tracker:added", (payload) => {
        if (payload.id === shapeId && payload.tracker.name === trackerName && !trackerRef.value) {
            isUpdatingFromPA = true;
            trackerRef.value = JSON.parse(JSON.stringify(payload.tracker));
            internalCopy = JSON.parse(JSON.stringify(payload.tracker));
            isUpdatingFromPA = false;
        }
    });

    const offRemove = modEventBus.on("tracker:removed", (payload) => {
        if (payload.id === shapeId && trackerRef.value && payload.trackerId === trackerRef.value.uuid) {
            isUpdatingFromPA = true;
            trackerRef.value = undefined;
            internalCopy = undefined;
            isUpdatingFromPA = false;
        }
    });

    // 3. Mod -> PA 的主动同步
    watch(trackerRef, (newVal) => {
        if (isUpdatingFromPA || !newVal || !internalCopy) return;

        const delta: Partial<Tracker> = {};
        let hasChanges = false;

        for (const key of Object.keys(newVal) as (keyof Tracker)[]) {
            if (newVal[key] !== internalCopy[key]) {
                (delta as any)[key] = newVal[key];
                (internalCopy as any)[key] = newVal[key];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            api.systems.trackers.update(shapeId, newVal.uuid, delta, { ui: true, server: true });
        }
    }, { deep: true });

    onUnmounted(() => {
        offUpdate();
        offAdd();
        offRemove();
    });

    return trackerRef;
}
