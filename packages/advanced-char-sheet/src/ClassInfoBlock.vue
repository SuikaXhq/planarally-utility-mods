<script setup lang="ts">
import { Table, Button, DiceButton } from "@planarally-mods/ui";
import type { TableColumn } from "@planarally-mods/ui";
import { computed } from "vue";
import { api } from "./main";
import type { ClassItem, CharacterStats } from "./data";
import { formatSign, getModifier } from "./data";
import { useI18n } from "./utils/i18n";

const props = defineProps<{
    totalLevel: number;
    proficiencyBonus: number;
    stats: CharacterStats;
}>();

const modelClasses = defineModel<ClassItem[]>("classes", { required: true });
const modelExp = defineModel<number>("exp", { required: true });
const modelSpeed = defineModel<number>("speed", { required: true });

const emit = defineEmits<{
    (e: "change"): void;
    (e: "roll", expr: string): void;
}>();

const { t } = useI18n();

const overviewColumns = computed<TableColumn<any>[]>(() => [
    { key: "totalLevel", label: t("ui.totalLevel", "Total Level"), align: "center" },
    { key: "exp", label: t("ui.exp", "EXP"), align: "center" },
    { key: "speed", label: t("ui.speed", "Speed"), align: "center" },
    { key: "proficiencyBonus", label: t("ui.proficiencyBonus", "Prof Bonus"), align: "center" },
]);

const overviewData = computed(() => [{
    totalLevel: props.totalLevel,
    exp: modelExp.value,
    speed: modelSpeed.value,
    proficiencyBonus: props.proficiencyBonus,
}]);

const columns = computed<TableColumn<ClassItem>[]>(() => [
    { key: "name", label: t("ui.class", "Class") },
    { key: "level", label: t("ui.level", "Level"), align: "center", width: "80px" },
    { key: "hitDice", label: t("ui.hitDiceCount", "Hit Dice"), align: "center", width: "80px" },
    { key: "hitDiceCurrent", label: t("ui.hitDiceCount", "Hit Dice"), align: "center", width: "100px" },
    { key: "actions", label: "", align: "center", width: "40px" },
]);

function getHitDiceExpression(hitDice: string) {
    const hd = hitDice.startsWith('d') ? hitDice : `d${hitDice}`;
    const conMod = getModifier(props.stats.con);
    return `1${hd} ${formatSign(conMod)}`;
}

function addClass() {
    modelClasses.value.push({
        id: (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
        name: t("ui.unnamed", "Unnamed"),
        level: 1,
        hitDice: "d8",
        hitDiceCurrent: 1,
    });
    emit("change");
}

async function removeClass(index: number) {
    const item = modelClasses.value[index];
    const confirmed = await api.ui.modals.confirm(
        t("ui.deleteConfirm", "Confirm Delete"),
        t("ui.deleteMessage", "Are you sure you want to delete {name}?").replace("{name}", item.name || t("ui.unnamed", "Unnamed")),
        { yes: t("ui.confirmDelete", "Delete"), no: t("ui.cancel", "Cancel") }
    );

    if (confirmed) {
        modelClasses.value.splice(index, 1);
        emit("change");
    }
}
</script>

<template>
    <div class="class-info-block">
        <!-- 总览栏 -->
        <Table :columns="overviewColumns" :data="overviewData">
            <template #totalLevel="{ row }">
                <span class="value readonly">{{ row.totalLevel }}</span>
            </template>
            <template #exp>
                <input type="number" v-model="modelExp" class="value-input" @change="emit('change')" />
            </template>
            <template #speed>
                <input type="number" v-model="modelSpeed" class="value-input" @change="emit('change')" />
            </template>
            <template #proficiencyBonus="{ row }">
                <span class="value readonly">{{ formatSign(row.proficiencyBonus) }}</span>
            </template>
        </Table>

        <!-- 职业列表 -->
        <Table :title="t('ui.classInfo', 'Class Info')" :columns="columns" :data="modelClasses" collapsible>
            <template #name="{ row }">
                <input v-model="row.name" class="inline-input" @change="emit('change')" />
            </template>
            <template #level="{ row }">
                <input type="number" min="1" v-model="row.level" class="inline-input center" @change="emit('change')" />
            </template>
            <template #hitDice="{ row }">
                <div class="dice-input-wrapper">
                    <input v-model="row.hitDice" class="inline-input center" placeholder="d8" @change="emit('change')" />
                    <DiceButton @roll="emit('roll', getHitDiceExpression(row.hitDice))" />
                </div>
            </template>
            <template #hitDiceCurrent="{ row }">
                <div class="hit-dice-cell">
                    <input type="number" v-model="row.hitDiceCurrent" class="inline-input current-input center" min="0" :max="row.level" @change="emit('change')" />
                    <span class="separator">/</span>
                    <span class="max-value">{{ row.level }}</span>
                </div>
            </template>
            <template #actions="{ index }">
                <Button size="small" type="danger" @click="removeClass(index)">
                    <template #icon>
                        <font-awesome-icon icon="fa-solid fa-trash-can" />
                    </template>
                </Button>
            </template>
            <template #footer>
                <div class="table-footer-wrapper">
                    <Button class="add-button" size="small" type="secondary" @click="addClass">+ {{ t('ui.addClass', 'Add Class') }}</Button>
                </div>
            </template>
        </Table>
    </div>
</template>

<style scoped>
.class-info-block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.overview-bar {
    display: flex;
    justify-content: space-around;
    background: #fcfcfc;
    border: 1px solid #eee;
    border-radius: 4px;
    padding: 0.5rem;
}

.overview-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
}

.label {
    font-size: 0.8rem;
    color: #666;
    text-transform: uppercase;
}

.value {
    font-size: 1.1rem;
    font-weight: bold;
    color: #333;
}

.value.readonly {
    color: #888;
}

.value-input {
    width: 60px;
    text-align: center;
    font-size: 1.1rem;
    font-weight: bold;
    border: none;
    border-bottom: 1px solid #ccc;
    background: transparent;
    color: #333;
    outline: none;
    /* 去除箭头 */
    -moz-appearance: textfield;
}

.value-input::-webkit-outer-spin-button,
.value-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.value-input:focus {
    border-bottom-color: #ff7052;
}

.inline-input {
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    padding: 2px 2px;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.inline-input:hover {
    background: #f0f0f0;
}

.inline-input:focus {
    border-color: #ff7052;
    background: white;
    outline: none;
}

.inline-input.center {
    text-align: center;
}

.hit-dice-count {
    font-size: 0.9rem;
    font-weight: bold;
    color: #444;
}

.dice-input-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
}

.hit-dice-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
}

.current-input {
    width: 30px;
    padding: 0;
    font-weight: bold;
}

.current-input::-webkit-outer-spin-button,
.current-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
.current-input {
    -moz-appearance: textfield;
}

.separator {
    color: #999;
    font-size: 0.9rem;
}

.max-value {
    color: #666;
    font-size: 0.9rem;
    min-width: 16px;
}

.table-footer-wrapper {
    display: flex;
    justify-content: center;
    background: white;
    padding: 0.8rem;
    border-top: 1px dashed #ddd;
}

.add-button {
    width: 100%;
}

:deep(.column-header) {
    background-color: #a52a2a;
}
</style>
