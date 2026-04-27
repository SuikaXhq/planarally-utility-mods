import type { GameApi, ModEvents, ApiModMeta, LocalId } from "@planarally/mod-api";
import CharTab from "./CharTab.vue";
import { useI18n } from "./utils/i18n";

export let api: GameApi;
const { t } = useI18n();

export const events: ModEvents = {
    async init(meta: ApiModMeta) {
        console.log(`Mod ${meta.name} version ${meta.version} initialized!`);
    },
    async initGame(gameApi: GameApi) {
        api = gameApi;
        console.log("Game initialized, registering Advanced Char Sheet");
        
        // Register the UI tab
        api.ui.shape.registerTab(
            { component: CharTab, id: "ADV_CHAR", label: t("ui.characterSheet") },
            (shape: LocalId) => api.getShape(shape)?.character !== undefined,
        );
    }
};
