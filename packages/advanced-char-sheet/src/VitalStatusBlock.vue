<script setup lang="ts">
import { Table, TagInput, type TableColumn } from "@planarally-mods/ui";
import { useI18n } from "./utils/i18n";
import { computed } from "vue";

const hp = defineModel<{ current: number; max: number; temp: number }>('hp', { required: true });
const ac = defineModel<number>('ac', { required: true });
const conditions = defineModel<string[]>('conditions', { required: true });

const emit = defineEmits<{
    (e: 'change'): void;
}>();

function onHpChange() {
    emit('change');
}

function onAcChange() {
    emit('change');
}

function onConditionsChange() {
    emit('change');
}

const { t } = useI18n();

const columns = computed<TableColumn<any>[]>(() => [
    { key: 'label', label: t('ui.stats'), width: '80px', align: 'center' as const },
    { key: 'value', label: t('ui.valueOrStatus', 'Value / Status'), align: 'center' as const }
]);

const tableData = computed(() => [
    { type: 'hp', label: t('ui.hp') },
    { type: 'ac', label: t('ui.ac') },
    { type: 'cond', label: t('ui.conditions') }
]);

const conditionSuggestions = computed(() => [
    t('conditions.hidden', 'Hidden'),
    t('conditions.stunned', 'Stunned'),
    t('conditions.prone', 'Prone'),
    t('conditions.frightened', 'Frightened'),
    t('conditions.poisoned', 'Poisoned'),
    t('conditions.charmed', 'Charmed'),
    t('conditions.restrained', 'Restrained'),
    t('conditions.invisible', 'Invisible'),
    t('conditions.blinded', 'Blinded'),
    t('conditions.deafened', 'Deafened'),
    t('conditions.incapacitated', 'Incapacitated'),
    t('conditions.paralyzed', 'Paralyzed'),
    t('conditions.petrified', 'Petrified'),
    t('conditions.unconscious', 'Unconscious'),
    t('conditions.exhaustion', 'Exhaustion')
]);
</script>

<template>
    <div class="vital-status-block">
        <Table :title="t('ui.currentStatus', 'Current Status')"
            :columns="columns"
            :data="tableData">
            <template #label="{ row }">
                <strong class="row-label">{{ row.label }}</strong>
            </template>
            <template #value="{ row }">
                <div v-if="row.type === 'hp'" class="hp-inputs">
                    <input class="vital-input large-text" type="number" v-model="hp.current" @change="onHpChange" />
                    <span class="hp-separator">/</span>
                    <input class="vital-input large-text" type="number" v-model="hp.max" @change="onHpChange" />
                    <span class="hp-separator">+</span>
                    <input class="vital-input large-text" type="number" v-model="hp.temp" @change="onHpChange" />
                </div>
                <input v-else-if="row.type === 'ac'" class="vital-input large-text" type="number" v-model="ac"
                    @input="onAcChange" />
                <TagInput v-else-if="row.type === 'cond'" v-model="conditions" @update:modelValue="onConditionsChange"
                    :placeholder="t('ui.addCondition', 'Add condition...')"
                    :suggestions="conditionSuggestions" />
            </template>
        </Table>
    </div>
</template>

<style scoped>
.vital-status-block {
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100%;
}

.vital-status-block :deep(.pa-ui-table-wrapper),
.vital-status-block :deep(.pa-ui-table) {
    height: 100%;
}

.vital-status-block :deep(td) {
    padding: 10px 14px;
    font-size: 1.1rem;
}

.row-label {
    font-size: 1.1rem;
}

.hp-inputs {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
}

.hp-separator {
    color: #666;
    font-weight: bold;
    margin: 0 0.2rem;
    font-size: 1.2rem;
}

.vital-input {
    text-align: center;
    padding: 2px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    transition: border-color 0.2s, background-color 0.2s;
    -moz-appearance: textfield;
}

.vital-input::-webkit-outer-spin-button,
.vital-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.vital-input.large-text {
    width: 38px;
    font-size: 1.1rem;
    font-weight: normal;
}
</style>
