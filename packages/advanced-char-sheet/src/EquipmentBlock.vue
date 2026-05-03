<script setup lang="ts">
import { Table, DiceButton, Tooltip, Button, TagInput } from "@planarally-mods/ui";
import type { TableColumn } from "@planarally-mods/ui";
import { ref, computed } from "vue";
import { api } from "./main";
import type { Item, CharacterStats } from "./data";
import { formatSign, getModifier } from "./data";
import { useI18n } from "./utils/i18n";

const props = defineProps<{
    stats: CharacterStats;
    proficiencyBonus: number;
}>();

const model = defineModel<{
    items: Item[];
    mainHandId: string | null;
    offHandId: string | null;
}>({ required: true });

const emit = defineEmits<{
    (e: "roll", expression: string): void;
    (e: "change"): void;
}>();

const { t } = useI18n();

const columns = computed<TableColumn<Item>[]>(() => [
    { key: "equip", label: "", align: "center", width: "36px" },
    { key: "name", label: t("ui.name", "Name") },
    { key: "scalingStat", label: t("ui.scalingStat", "Stat"), align: "center", width: "56px" },
    { key: "hitBonus", label: t("ui.hitBonus", "Hit Bonus"), align: "center", width: "60px" },
    { key: "damageDice", label: t("ui.damageDice", "Damage"), align: "center", width: "100px" },
    { key: "tags", label: t("ui.tags", "Tags") },
    { key: "actions", label: "", align: "center", width: "40px" },
]);

function addItem() {
    const newItem: Item = {
        id: (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
        name: "新物品",
        weight: 0,
        quantity: 1,
        remark: "",
        tags: [t("ui.weapon", "Weapon")],
        scalingStat: "str",
    };
    model.value.items.push(newItem);
    emit("change");
}

async function removeItem(index: number) {
    const item = model.value.items[index];
    const confirmed = await api.ui.modals.confirm(
        t("ui.deleteConfirm", "Confirm Delete"),
        t("ui.deleteMessage", "Are you sure you want to delete {name}?").replace("{name}", item.name || t("ui.unnamed", "Unnamed")),
        { yes: t("ui.confirmDelete", "Delete"), no: t("ui.cancel", "Cancel") }
    );

    if (confirmed) {
        if (model.value.mainHandId === item.id) model.value.mainHandId = null;
        if (model.value.offHandId === item.id) model.value.offHandId = null;
        model.value.items.splice(index, 1);
        emit("change");
    }
}

function handleEquip(id: string, hand: 'main' | 'off') {
    if (hand === 'main') {
        model.value.mainHandId = model.value.mainHandId === id ? null : id;
    } else {
        model.value.offHandId = model.value.offHandId === id ? null : id;
    }
    emit("change");
}

function handleTagsChange(item: Item, newTags: string[]) {
    const wasWeapon = isWeapon(item);
    item.tags = newTags;
    const isNowWeapon = isWeapon(item);

    if (!wasWeapon && isNowWeapon && !item.scalingStat) {
        item.scalingStat = 'str';
    }
    emit('change');
}

function isWeapon(item: Item) {
    return item.tags.includes(t("ui.weapon", "Weapon")) || item.tags.includes("武器") || item.tags.includes("Weapon");
}

function getHitExpression(item: Item): string {
    const statValue = props.stats[item.scalingStat || 'str'];
    const statMod = getModifier(statValue);
    const total = statMod + props.proficiencyBonus;
    return `1d20 ${formatSign(total)}`;
}

function getDmgExpression(item: Item): string {
    const statValue = props.stats[item.scalingStat || 'str'];
    const statMod = getModifier(statValue);
    return `${item.damageDice || '1d4'} ${formatSign(statMod)}`;
}

function getFinalHitMod(item: Item): number {
    const statValue = props.stats[item.scalingStat || 'str'];
    const statMod = getModifier(statValue);
    return statMod + props.proficiencyBonus;
}

const allTags = computed(() => {
    const tags = new Set<string>();
    model.value.items.forEach(item => {
        item.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
});

function handleRoll(expr: string) {
    emit("roll", expr);
}
</script>

<template>
    <div class="equipment-block">
        <section class="hand-section">
            <Table :title="t('ui.equipment')" :columns="columns" :data="model.items" collapsible>
                <template #equip="{ row }">
                    <div class="equip-cell" @click="handleEquip(row.id, 'main')">
                        <div class="equip-checkbox" :class="{ checked: model.mainHandId === row.id }"></div>
                    </div>
                </template>
                <template #name="{ row }">
                    <Tooltip placement="right">
                        <input v-model="row.name" class="inline-input" @change="emit('change')" />
                        <template #content>
                            <div class="remark-tooltip">
                                <textarea v-model="row.remark" @change="emit('change')"></textarea>
                            </div>
                        </template>
                    </Tooltip>
                </template>
                <template #scalingStat="{ row }">
                    <select v-if="isWeapon(row)" v-model="row.scalingStat" class="inline-select"
                        @change="emit('change')">
                        <option value="str">{{ t('stats.str') }}</option>
                        <option value="dex">{{ t('stats.dex') }}</option>
                    </select>
                    <span v-else></span>
                </template>
                <template #hitBonus="{ row }">
                    <div v-if="isWeapon(row)" class="mod-cell weapon-mod">
                        <span class="mod-badge"
                            :class="{ positive: getFinalHitMod(row) >= 0, negative: getFinalHitMod(row) < 0 }">
                            {{ formatSign(getFinalHitMod(row)) }}
                        </span>
                        <DiceButton @roll="handleRoll(getHitExpression(row))" />
                    </div>
                </template>
                <template #damageDice="{ row }">
                    <div v-if="isWeapon(row)" class="damage-cell">
                        <input v-model="row.damageDice" class="inline-input dice-input" placeholder="1d4"
                            @change="emit('change')" />
                        <span class="mod-badge"
                            :class="{ positive: getModifier(props.stats[row.scalingStat || 'str']) >= 0, negative: getModifier(props.stats[row.scalingStat || 'str']) < 0 }">
                            {{ formatSign(getModifier(props.stats[row.scalingStat || 'str'])) }}
                        </span>
                        <DiceButton @roll="handleRoll(getDmgExpression(row))" />
                    </div>
                </template>
                <template #tags="{ row }">
                    <TagInput v-model="row.tags" :suggestions="allTags"
                        @update:modelValue="(val) => handleTagsChange(row, val)" />
                </template>
                <template #actions="{ index }">
                    <Button size="small" type="danger" @click="removeItem(index)">
                        <template #icon>
                            <font-awesome-icon icon="fa-solid fa-trash-can" />
                        </template>
                    </Button>
                </template>
                <template #empty>
                    <div class="empty-hint">{{ t('ui.emptyEquipment', 'No equipment added. Click below to add.') }}</div>
                </template>
                <template #footer>
                    <div class="table-footer-wrapper">
                        <Button class="add-button" size="small" type="secondary" @click="addItem">+ {{ t('ui.addEquipment', 'Add Equipment') }}</Button>
                    </div>
                </template>
            </Table>
        </section>
    </div>
</template>

<style scoped>
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
.equipment-block {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.hand-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 1rem;
    cursor: pointer;
    background: #fcfcfc;
    border-bottom: 1px solid #eee;
}

.hand-header:hover {
    background: #f5f5f5;
}

.hand-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.hand-label {
    font-size: 0.8rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.equipped-name {
    font-size: 1.1rem;
    font-weight: bold;
    color: #2c3e50;
    margin-left: 0.5rem;
    line-height: 1;
}

.equipped-name.none {
    font-style: italic;
    color: #ccc;
    font-weight: normal;
}

.hand-actions {
    display: flex;
    gap: 0.5rem;
    min-width: 40px;
    /* 留出空间即使按钮隐藏 */
}

.item-selector {
    padding: 1rem;
    background: #fafafa;
}

.inline-input,
.inline-select {
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    padding: 2px 2px;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: all 0.2s;
    cursor: pointer;
}

.inline-input:hover,
.inline-select:hover {
    background: #f0f0f0;
}

.inline-input:focus,
.inline-select:focus {
    border-color: #ff7052;
    background: white;
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 112, 82, 0.1);
}

.inline-input.center {
    text-align: center;
}

.table-footer {
    margin-top: 0.5rem;
    display: flex;
    justify-content: flex-end;
}

.remark-tooltip {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 150px;
}

.remark-tooltip textarea {
    width: 100%;
    height: 60px;
    font-size: 0.8rem;
    background: #444;
    color: white;
    border: none;
    padding: 4px;
}

.empty-hint {
    padding: 1rem;
    text-align: center;
    color: #999;
    font-size: 0.9rem;
}

.expand-icon {
    font-size: 0.8rem;
    color: #999;
}

/* 覆盖 Table 组件的一些样式以适配紧凑布局 */
:deep(.column-header),
:deep(.data-cell) {
    padding: 8px 4px;
}

:deep(.column-header) {
    white-space: nowrap;
    background-color: #a52a2a;
    /* 与项目主色调一致的暗红色 */
}

/* 自定义单选框样式（表现为复选框） */
.equip-checkbox {
    width: 20px;
    height: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #ddd;
    border-radius: 4px;
    background: white;
    transition: all 0.2s;
    margin: 0 auto;

    &.checked {
        border-color: #ff7052;
        background: #ff7052;

        &::after {
            content: "✓";
            color: white;
            font-size: 14px;
            font-weight: bold;
        }
    }

    &:hover {
        border-color: #ff7052;
    }
}

/* 命中与加值样式 */
.mod-cell {
    display: flex;
    align-items: center;
    gap: 4px;
    justify-content: center;
}

.mod-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 24px;
    padding: 0 6px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.9rem;
    background: #f0f0f0;
    color: #666;

    &.positive {
        background: #e6fffa;
        color: #38b2ac;
    }

    &.negative {
        background: #fff5f5;
        color: #e53e3e;
    }
}

/* 伤害单元格样式 */
.damage-cell {
    display: flex;
    align-items: center;
    gap: 2px;
    justify-content: center;

    .dice-input {
        width: 50px;
        text-align: center;
    }

    .plus-sign {
        color: #999;
        font-size: 0.8rem;
    }

    .bonus-input {
        width: 35px;
        text-align: center;
    }
}

.equip-cell {
    padding: 8px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover .equip-checkbox {
        border-color: #ff7052;
    }
}
</style>
