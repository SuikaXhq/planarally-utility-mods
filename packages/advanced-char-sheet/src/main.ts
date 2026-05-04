import type { GameApi, ModEvents, ApiModMeta, LocalId, Tracker, Sync, TrackerId } from "@planarally/mod-api";
import CharTab from "./CharTab.vue";
import { useI18n } from "./utils/i18n";
import { SyncManager } from "./managers/SyncManager";
import { defaultCharSheetData } from "./data";
import type { CharSheetData } from "./data";

export let api: GameApi;
const { t } = useI18n();

export const events: ModEvents = {
    async init(meta: ApiModMeta) {
        console.log(`Mod ${meta.name} version ${meta.version} initialized!`);
    },
    async initGame(gameApi: GameApi) {
        api = gameApi;
        console.log("Game initialized, registering Advanced Char Sheet");
        
        SyncManager.init(api, t);
        SyncManager.setupEventHandlers();

        // Register hook: Intercept tracker updates for business validation
        api.hooks.tap("pre:tracker:update", (delta, { id, tracker }) => {
            return SyncManager.handlePreTrackerUpdate(id, tracker, delta) as Partial<Tracker>;
        });

        // Register the UI tab
        api.ui.shape.registerTab(
            { component: CharTab, id: "ADV_CHAR", label: t("ui.characterSheet") },
            (shapeId: LocalId) => {
                // Access reactive state to trigger re-evaluation
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                api.systemsState.characters.reactive.characterIds;

                const shape = api.getShape(shapeId);
                if (shape && shape.character !== undefined) return true;
                
                // Alternative: Check character system to prevent synchronization delays in shape.character
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
                    // Preload Character DataBlock cache in background to ensure preTrackerUpdate hits memory
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
};

