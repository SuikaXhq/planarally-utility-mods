<script setup lang="ts">
import { Table, Tooltip } from "@planarally-mods/ui";
import type { TableColumn } from "@planarally-mods/ui";
import { computed, ref } from "vue";
import type { Skill, CharacterStats, ProficiencyLevel } from "./data";
import { calculateSkillModifier, formatSign } from "./data";
import RollBadge from "./RollBadge.vue";
import { useI18n } from "./utils/i18n";

const props = withDefaults(defineProps<{
    stats: CharacterStats;
    proficiencyBonus: number;
    collapsed?: boolean;
}>(), {
    collapsed: true,
});

const skills = defineModel<Skill[]>({ required: true });

const emit = defineEmits<{
    (e: "roll", expression: string): void;
    (e: "change"): void;
}>();

const isCollapsed = ref(props.collapsed);

function toggleCollapse() {
    isCollapsed.value = !isCollapsed.value;
}

const { t } = useI18n();

const proficiencyLevels = computed(() => [
    { label: t("ui.none"), value: 0 },
    { label: t("ui.half"), value: 0.5 },
    { label: t("ui.proficient"), value: 1 },
    { label: t("ui.expertise"), value: 2 }
]);

const skillColumns = computed<TableColumn<Skill>[]>(() => [
    { key: "name", label: t("ui.skills") },
    { key: "baseStat", label: t("ui.stats"), align: "center", width: "56px" },
    { key: "modifier", label: t("ui.modifier"), align: "center", width: "66px" },
    { key: "proficiency", label: t("ui.proficiencies"), align: "center", width: "76px" }
]);

function getSkillModifier(skill: Skill): number {
    const statValue = props.stats[skill.baseStat];
    return calculateSkillModifier(statValue, props.proficiencyBonus, skill.proficiency);
}

function buildDiceExpression(skill: Skill): string {
    const mod = getSkillModifier(skill);
    return `1d20 ${mod >= 0 ? "+" : "-"} ${Math.abs(mod)}`;
}

function handleRoll(expr: string, skill: Skill) {
    const realExpr = buildDiceExpression(skill);
    emit("roll", realExpr);
}

function handleChange() {
    emit("change");
}

function getRowClass(row: Skill) {
    return `row-${row.baseStat}`;
}

function getSkillDescription(name: string): string {
    return t(`skill_descriptions.${name}`);
}
</script>

<template>
    <section class="skills-block">
        <Table :title="t('ui.skills')" :columns="skillColumns" :data="skills" :row-class="getRowClass" collapsible>
            <template #name="{ row }">
                <Tooltip placement="right" max-width="200px">
                    <span class="skill-name-label">{{ t(`skills.${row.name}`) }}</span>
                    <template #content>
                        <div class="skill-tooltip-content">
                            <strong>{{ t(`skills.${row.name}`) }}</strong>
                            <p>{{ getSkillDescription(row.name) }}</p>
                        </div>
                    </template>
                </Tooltip>
            </template>
            <template #baseStat="{ row }">
                <span class="stat-tag" :class="`tag-${row.baseStat}`">
                    {{ t(`stats.${row.baseStat}`) }}
                </span>
            </template>
            <template #modifier="{ row }">
                <RollBadge :modifier="getSkillModifier(row)" :expression="buildDiceExpression(row)"
                    @roll="handleRoll($event, row)" />
            </template>
            <template #proficiency="{ row }">
                <select v-model="row.proficiency" @change="handleChange" class="inline-select">
                    <option v-for="lvl in proficiencyLevels" :key="lvl.value" :value="lvl.value">
                        {{ lvl.label }}
                    </option>
                </select>
            </template>
        </Table>
    </section>
</template>

<style scoped>
.skills-block {
    flex-shrink: 0;
    width: max-content;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    margin-bottom: 0.5rem;
}

.section-header:hover {
    opacity: 0.8;
}

.section-title {
    margin: 0;
    color: #2c3e50;
    font-size: 1.1rem;
    font-weight: bold;
    border-left: 4px solid #ff7052;
    padding-left: 0.5rem;
}

.collapse-indicator {
    color: #999;
    font-size: 0.8rem;
    transition: transform 0.2s;
}

.skills-content {
    margin-top: 0.5rem;
}

/* 技能行染色 */
:deep(.row-str) {
    background-color: rgba(231, 76, 60, 0.05);
}

:deep(.row-dex) {
    background-color: rgba(230, 126, 34, 0.05);
}

:deep(.row-int) {
    background-color: rgba(52, 152, 219, 0.05);
}

:deep(.row-wis) {
    background-color: rgba(46, 204, 113, 0.05);
}

:deep(.row-cha) {
    background-color: rgba(155, 89, 182, 0.05);
}

.skill-name-label {
    cursor: help;
    border-bottom: 1px dotted #ccc;
    font-size: 0.95rem;
}

.skill-tooltip-content {
    max-width: 200px;
    white-space: normal;
    line-height: 1.4;
}

.skill-tooltip-content p {
    margin: 4px 0 0 0;
    font-size: 0.85rem;
    color: #eee;
}

.stat-tag {
    font-size: 0.8rem;
    padding: 1px 4px;
    border-radius: 3px;
    color: white;
}

.tag-str {
    background-color: #e74c3c;
}

.tag-dex {
    background-color: #e67e22;
}

.tag-int {
    background-color: #3498db;
}

.tag-wis {
    background-color: #2ecc71;
}

.tag-cha {
    background-color: #9b59b6;
}



.inline-select {
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    padding: 2px 2px;
    border-radius: 4px;
    font-size: 0.9rem;
    transition: all 0.2s;
    cursor: pointer;
    text-align: center;
}

.inline-select:hover {
    background: #f0f0f0;
}

.inline-select:focus {
    border-color: #ff7052;
    background: white;
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 112, 82, 0.1);
}

/* 覆盖表格默认 padding 以压缩宽度 */
:deep(.column-header),
:deep(.data-cell) {
    padding: 0.4rem 0.3rem;
}
</style>
