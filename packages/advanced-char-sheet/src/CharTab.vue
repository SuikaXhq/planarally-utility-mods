<script setup lang="ts">
import VitalStatusBlock from "./VitalStatusBlock.vue";
import RecordList from "./RecordList.vue";
import { api } from "./main";
import { ToolName } from "@planarally/mod-api";
import StatsBlock from "./StatsBlock.vue";
import SkillsBlock from "./SkillsBlock.vue";
import EquipmentBlock from "./EquipmentBlock.vue";
import ClassInfoBlock from "./ClassInfoBlock.vue";
import { useI18n } from "./utils/i18n";
import { useCharSheetData } from "./composables/useCharSheetData";

const { t } = useI18n();
const { data, save, addRecordItem, removeRecordItem } = useCharSheetData();

async function handleRoll(expr: string) {
    if (!api.systems.dice.isLoaded) await api.systems.dice.loadSystems();
    api.ui.activateTool(ToolName.Dice);
    await new Promise((resolve) => setTimeout(resolve, 100));
    api.systems.dice.setInput(expr);
}
</script>

<template>
    <div class="adv-char-sheet">
        <!-- 基础信息与属性模块，60%和40%布局 -->
        <div class="top-section">
            <div class="stats-wrapper">
                <StatsBlock v-model="data.stats" v-model:saves="data.saveProficiencies" :proficiency-bonus="data.proficiencyBonus" @roll="handleRoll" @update:modelValue="save" @update:saves="save" />
            </div>
            
            <div class="vital-info-wrapper">
                <VitalStatusBlock v-model:hp="data.hp" v-model:ac="data.ac" v-model:conditions="data.conditions" @change="save" />
            </div>
        </div>

        <!-- 主要内容区域：技能与装备并排 -->
        <div class="main-content-grid">
            <!-- 技能 -->
            <SkillsBlock v-model="data.skills" :stats="data.stats" :proficiency-bonus="data.proficiencyBonus"
                @roll="handleRoll" @change="save" />

            <!-- 右侧：装备与特性 -->
            <div class="right-column">
                <!-- 职业信息模块 -->
                <ClassInfoBlock v-model:classes="data.classes" v-model:exp="data.exp" v-model:speed="data.speed"
                    :total-level="data.level" :proficiency-bonus="data.proficiencyBonus" :stats="data.stats" @change="save" @roll="handleRoll" />

                <!-- 装备与武器 -->
                <EquipmentBlock v-model="data.equipment" :stats="data.stats" :proficiency-bonus="data.proficiencyBonus"
                    @roll="handleRoll" @change="save" />

                <!-- 记录项：特性、专长 -->
                <div class="records-grid">
                    <RecordList
                        :title="t('ui.features')"
                        v-model="data.records.features"
                        @change="save"
                        @add="addRecordItem('features', t('ui.name'), t('ui.description'))"
                        @remove="(i: number) => removeRecordItem('features', i)"
                    />
                    <RecordList
                        :title="t('ui.feats')"
                        v-model="data.records.feats"
                        @change="save"
                        @add="addRecordItem('feats', t('ui.name'), t('ui.description'))"
                        @remove="(i: number) => removeRecordItem('feats', i)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.adv-char-sheet {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: #f5f5f5;
    height: 100%;
    max-height: 80vh;
    overflow-y: auto;
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
}

.top-section {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: stretch;
}

.stats-wrapper {
    width: 100%;
}

.stats-wrapper :deep(.stats-block) {
    height: 100%;
    margin-bottom: 0;
}

.stats-wrapper :deep(.pa-ui-table-wrapper),
.stats-wrapper :deep(.pa-ui-table) {
    height: 100%;
}

.top-section :deep(.pa-ui-table thead th) {
    padding: 8px 4px !important;
    font-size: 1rem !important;
    line-height: 1.5 !important;
    white-space: nowrap;
}

.top-section :deep(.pa-ui-table thead) {
    height: 1px;
}

.vital-info-wrapper {
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100%;
}

.vital-input:hover,
.vital-input:focus {
    border-color: #aaa;
    background-color: #f5f5f5;
    outline: none;
}

.vital-input::-webkit-outer-spin-button,
.vital-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.main-content-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: start;
}

.right-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* 记录项：特性、专长并排 */
.records-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

.records-grid > * {
    min-width: 0;
}
</style>
