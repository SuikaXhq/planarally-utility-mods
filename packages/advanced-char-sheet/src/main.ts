import { proxyModEvents } from "@planarally/mod-api";
import type { GameApi, ModEvents, ApiModMeta, LocalId, Tracker, Sync, TrackerId } from "@planarally/mod-api";
import CharTab from "./CharTab.vue";
import { useI18n } from "./utils/i18n";
import { SyncManager } from "./managers/SyncManager";
import { defaultCharSheetData } from "./data";
import type { CharSheetData } from "./data";

export let api: GameApi;
const { t } = useI18n();

export const events: ModEvents = proxyModEvents({
    async init(meta: ApiModMeta) {
        console.log(`Mod ${meta.name} version ${meta.version} initialized!`);
    },
    async initGame(gameApi: GameApi) {
        api = gameApi;
        console.log("Game initialized, registering Advanced Char Sheet");
        
        SyncManager.init(api, t);

        // Register the UI tab
        api.ui.shape.registerTab(
            { component: CharTab, id: "ADV_CHAR", label: t("ui.characterSheet") },
            (shapeId: LocalId) => {
                // 访问响应式状态以触发重新评估
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                api.systemsState.characters.reactive.characterIds;

                const shape = api.getShape(shapeId);
                if (shape && shape.character !== undefined) return true;
                
                // 备选方案：检查 character 系统，防止某些情况下 shape.character 同步延迟
                const globalId = api.getGlobalId(shapeId);
                if (globalId) {
                    for (const char of api.systems.characters.getAllCharacters()) {
                        if (char.shapeId === globalId) return true;
                    }
                }
                return false;
            },
        );
    },

    async loadLocation() {
        console.log("Location loaded, preloading Character DataBlocks...");
        const shapes = api.systemsState.properties.readonly.data.keys();
        for (const localId of shapes) {
            const shape = api.getShape(localId);
            if (shape?.character !== undefined) {
                const globalId = api.getGlobalId(localId);
                if (globalId) {
                    // 后台异步加载角色的 DataBlock 缓存，以保证 preTrackerUpdate 能命中内存
                    api.getOrLoadDataBlock<Record<string, unknown>, CharSheetData>({
                        category: "shape",
                        shape: globalId,
                        name: "char-sheet"
                    }, { defaultData: defaultCharSheetData }).catch((e) => {
                        console.warn("Failed to preload char-sheet for shape", globalId, e);
                    });
                }
            }
        }
    },

    preTrackerUpdate(id: LocalId, tracker: Tracker, delta: Partial<Tracker>, _syncTo: Sync) {
        return SyncManager.handlePreTrackerUpdate(id, tracker, delta);
    }
});
