import { ref, watch, onUnmounted, type Ref } from "vue";
import type { GameApi, LocalId, UiShapeCustomData, ApiShapeCustomDataIdentifier } from "../main.js";

export function useCustomData(api: GameApi, shapeId: LocalId, identifier: Pick<ApiShapeCustomDataIdentifier, "source" | "prefix" | "name">): Ref<UiShapeCustomData | undefined> {
    const customDataRef = ref<UiShapeCustomData>();
    let internalCopy: UiShapeCustomData | undefined;
    let isUpdatingFromPA = false;

    // 1. Initialization logic
    const existingElements = api.systems.customData.export(shapeId);
    const target = existingElements.find(
        e => e.source.toLowerCase() === identifier.source.toLowerCase() &&
             e.prefix.toLowerCase() === identifier.prefix.toLowerCase() &&
             e.name.toLowerCase() === identifier.name.toLowerCase()
    );
    
    if (target) {
        customDataRef.value = JSON.parse(JSON.stringify(target));
        internalCopy = JSON.parse(JSON.stringify(target));
    }

    // 2. Passive synchronization from PA to Mod
    const offUpdate = api.eventBus.on("customData:updated", (payload) => {
        if (payload.id === shapeId && customDataRef.value && payload.elementId === customDataRef.value.id) {
            isUpdatingFromPA = true;
            Object.assign(customDataRef.value, payload.delta);
            Object.assign(internalCopy!, payload.delta);
            isUpdatingFromPA = false;
        }
    });

    const offAdd = api.eventBus.on("customData:added", (payload) => {
        if (payload.id === shapeId && !customDataRef.value &&
            payload.element.source.toLowerCase() === identifier.source.toLowerCase() &&
            payload.element.prefix.toLowerCase() === identifier.prefix.toLowerCase() &&
            payload.element.name.toLowerCase() === identifier.name.toLowerCase()) {
            
            isUpdatingFromPA = true;
            customDataRef.value = JSON.parse(JSON.stringify(payload.element));
            internalCopy = JSON.parse(JSON.stringify(payload.element));
            isUpdatingFromPA = false;
        }
    });

    const offRemove = api.eventBus.on("customData:removed", (payload) => {
        if (payload.id === shapeId && customDataRef.value && payload.elementId === customDataRef.value.id) {
            isUpdatingFromPA = true;
            customDataRef.value = undefined;
            internalCopy = undefined;
            isUpdatingFromPA = false;
        }
    });

    // 3. Active synchronization from Mod to PA
    watch(customDataRef, (newVal) => {
        if (isUpdatingFromPA || !newVal || !internalCopy) return;

        let hasChanges = false;

        // name
        if (newVal.name !== internalCopy.name) {
            api.systems.customData.setName(shapeId, newVal.id, newVal.name, true);
            internalCopy.name = newVal.name;
            hasChanges = true;
        }

        // value / kind
        if (newVal.kind !== internalCopy.kind) {
            api.systems.customData.updateKind(shapeId, newVal.id, newVal.kind, true);
            internalCopy.kind = newVal.kind;
            hasChanges = true;
        }
        
        if (newVal.value !== internalCopy.value) {
            api.systems.customData.updateValue(shapeId, newVal.id, newVal.value, true);
            internalCopy.value = newVal.value as any;
            hasChanges = true;
        }

        // reference
        if (newVal.reference !== internalCopy.reference) {
            api.systems.customData.setReference(shapeId, newVal.id, newVal.reference ?? "", true);
            internalCopy.reference = newVal.reference;
            hasChanges = true;
        }

        // description
        if (newVal.description !== internalCopy.description) {
            api.systems.customData.setDescription(shapeId, newVal.id, newVal.description ?? "", true);
            internalCopy.description = newVal.description;
            hasChanges = true;
        }

        // We don't handle ID, source, or prefix mutations as those are identifiers
    }, { deep: true });

    onUnmounted(() => {
        offUpdate();
        offAdd();
        offRemove();
    });

    return customDataRef;
}
