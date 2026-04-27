<script setup lang="ts">
import { Table, Tooltip } from "@planarally-mods/ui";
import type { TableColumn } from "@planarally-mods/ui";
import type { CharacterStats } from "./data";
import { formatModifier, getModifier } from "./data";
import RollBadge from "./RollBadge.vue";
import { computed } from "vue";
import { useI18n } from "./utils/i18n";

const stats = defineModel<CharacterStats>({ required: true });
const saveProficiencies = defineModel<Record<string, boolean>>('saves', { required: true });
const props = defineProps<{ proficiencyBonus: number }>();
const emit = defineEmits<{ (e: 'roll', expr: string): void }>();

const { t } = useI18n();

const statKeys = ["str", "dex", "con", "int", "wis", "cha"];

const columns = computed<TableColumn<Record<string, any>>[]>(() => [
    { key: 'label', label: '', align: 'center' as const },
    ...statKeys.map(key => ({
        key,
        label: t(`stats.${key}`),
        align: "center" as const
    }))
]);

const tableData = computed(() => [
    { type: 'stat', label: t('ui.normal') },
    { type: 'base', label: t('ui.roll') },
    { type: 'save', label: t('ui.saveProficiency') }
]);

function updateStat(key: string, event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && stats.value) {
        stats.value = { ...stats.value, [key]: val };
    }
}

function getSaveModifier(key: string): number {
    const statMod = getModifier(stats.value[key]);
    return statMod + (saveProficiencies.value[key] ? props.proficiencyBonus : 0);
}

function buildBaseExpr(key: string): string {
    const mod = getModifier(stats.value[key]);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    return `1d20${modStr}`;
}

function buildSaveExpr(key: string): string {
    const mod = getSaveModifier(key);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    return `1d20${modStr}`;
}
</script>

<template>
    <div class="stats-block">
        <Table :title="t('ui.stats')" :columns="columns" :data="tableData">
            <template v-for="col in columns" :key="col.key" #[col.key]="{ row }">
                <template v-if="col.key === 'label'">
                    <span class="row-label">{{ row.label }}</span>
                </template>
                <template v-else>
                    <template v-if="row.type === 'stat'">
                        <Tooltip placement="bottom">
                            <input class="stat-input" type="number" :value="stats[col.key]"
                                @change="updateStat(col.key, $event)" />
                            <template #content>{{ formatModifier(stats[col.key]) }}</template>
                        </Tooltip>
                    </template>
                    <template v-else-if="row.type === 'base'">
                        <div class="roll-cell">
                            <RollBadge :modifier="getModifier(stats[col.key])" :expression="buildBaseExpr(col.key)" @roll="emit('roll', $event)" />
                        </div>
                    </template>
                    <template v-else-if="row.type === 'save'">
                        <div class="save-cell">
                            <input type="checkbox" v-model="saveProficiencies[col.key]" />
                            <RollBadge :modifier="getSaveModifier(col.key)" :expression="buildSaveExpr(col.key)" @roll="emit('roll', $event)" />
                        </div>
                    </template>
                </template>
            </template>
        </Table>
    </div>
</template>

<style scoped>
.stats-block {
    margin-bottom: 1rem;
}

.row-label {
    font-weight: bold;
    color: #666;
    font-size: 0.85rem;
    white-space: nowrap;
}

.roll-cell {
    display: flex;
    justify-content: center;
}

.save-cell {
    padding: 0.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
}

.stat-input {
    font-weight: bold;
    font-size: 1.2rem;
    width: 2.5em;
    text-align: center;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    transition: border-color 0.2s, background-color 0.2s;
    padding: 0.1rem;
    -moz-appearance: textfield;
}

.stat-input::-webkit-outer-spin-button,
.stat-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.stat-input:hover,
.stat-input:focus {
    border-color: #aaa;
    background-color: #f5f5f5;
    outline: none;
}
</style>
