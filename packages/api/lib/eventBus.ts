import type { LocalId } from "./main.js";
import type { Tracker, TrackerId } from "./main.js";
import type { ApiShapeCustomData } from "./main.js";
import type { ElementId, UiShapeCustomData } from "./main.js";
import type { Sync } from "./main.js";
import type { ModEvents } from "./main.js";

export interface PAEventMap {
    "tracker:added": { id: LocalId; tracker: Tracker; syncTo: Sync };
    "tracker:updated": { id: LocalId; trackerId: TrackerId; delta: Partial<Tracker>; syncTo: Sync };
    "tracker:removed": { id: LocalId; trackerId: TrackerId; syncTo: Sync };
    "customData:added": { id: LocalId; element: UiShapeCustomData; syncTo: Sync };
    "customData:updated": { id: LocalId; elementId: ElementId; delta: Partial<ApiShapeCustomData>; syncTo: Sync };
    "customData:removed": { id: LocalId; elementId: ElementId; syncTo: Sync };
}

type EventHandler<K extends keyof PAEventMap> = (payload: PAEventMap[K]) => void;

class PAEventBus {
    private listeners: { [K in keyof PAEventMap]?: EventHandler<K>[] } = {};

    on<K extends keyof PAEventMap>(event: K, handler: EventHandler<K>): () => void {
        if (!this.listeners[event]) {
            (this.listeners as any)[event] = [];
        }
        this.listeners[event]!.push(handler);
        return () => this.off(event, handler);
    }

    off<K extends keyof PAEventMap>(event: K, handler: EventHandler<K>) {
        if (!this.listeners[event]) return;
        (this.listeners as any)[event] = this.listeners[event]!.filter(h => h !== handler);
    }

    emit<K extends keyof PAEventMap>(event: K, payload: PAEventMap[K]) {
        if (!this.listeners[event]) return;
        for (const handler of this.listeners[event]!) {
            handler(payload);
        }
    }
}

export const modEventBus = new PAEventBus();

/**
 * 包装用户定义的 ModEvents，使其在触发时自动同步到全局 EventBus。
 * Mod 开发者在其 main.ts 或 init 阶段包裹其 events 即可。
 */
export function proxyModEvents(events: ModEvents = {}): ModEvents {
    const originalOnTrackerAdded = events.onTrackerAdded;
    const originalOnTrackerUpdated = events.onTrackerUpdated;
    const originalOnTrackerRemoved = events.onTrackerRemoved;
    const originalOnCustomDataAdded = events.onCustomDataAdded;
    const originalOnCustomDataUpdated = events.onCustomDataUpdated;
    const originalOnCustomDataRemoved = events.onCustomDataRemoved;

    events.onTrackerAdded = (id: LocalId, tracker: Tracker, syncTo: Sync) => {
        modEventBus.emit("tracker:added", { id, tracker, syncTo });
        originalOnTrackerAdded?.(id, tracker, syncTo);
    };

    events.onTrackerUpdated = (id: LocalId, trackerId: TrackerId, delta: Partial<Tracker>, syncTo: Sync) => {
        modEventBus.emit("tracker:updated", { id, trackerId, delta, syncTo });
        originalOnTrackerUpdated?.(id, trackerId, delta, syncTo);
    };

    events.onTrackerRemoved = (id: LocalId, trackerId: TrackerId, syncTo: Sync) => {
        modEventBus.emit("tracker:removed", { id, trackerId, syncTo });
        originalOnTrackerRemoved?.(id, trackerId, syncTo);
    };

    events.onCustomDataAdded = (id: LocalId, element: UiShapeCustomData, syncTo: Sync) => {
        modEventBus.emit("customData:added", { id, element, syncTo });
        originalOnCustomDataAdded?.(id, element, syncTo);
    };

    events.onCustomDataUpdated = (id: LocalId, elementId: ElementId, delta: Partial<ApiShapeCustomData>, syncTo: Sync) => {
        modEventBus.emit("customData:updated", { id, elementId, delta, syncTo });
        originalOnCustomDataUpdated?.(id, elementId, delta, syncTo);
    };

    events.onCustomDataRemoved = (id: LocalId, elementId: ElementId, syncTo: Sync) => {
        modEventBus.emit("customData:removed", { id, elementId, syncTo });
        originalOnCustomDataRemoved?.(id, elementId, syncTo);
    };

    return events;
}
