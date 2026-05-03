<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button, Tooltip } from '@planarally-mods/ui';
import type { RecordItem } from './data';
import { useI18n } from './utils/i18n';
import { api } from './main';

const props = defineProps<{
    modelValue: RecordItem;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: RecordItem): void;
    (e: 'change'): void;
    (e: 'remove'): void;
}>();

// 默认折叠状态
const isCollapsed = ref(true);

// 建立本地状态以便双向绑定
const localData = ref<RecordItem>({ ...props.modelValue });

const { t } = useI18n();

// 同步外部变化
watch(() => props.modelValue, (newVal) => {
    localData.value = { ...newVal };
}, { deep: true });

function updateData() {
    emit('update:modelValue', { ...localData.value });
    emit('change');
}

function toggleCollapse() {
    isCollapsed.value = !isCollapsed.value;
}

function handleInputClick(e: Event) {
    if (isCollapsed.value) {
        // 折叠状态下点击标题，应该冒泡给 header 从而触发展开
        return;
    } else {
        // 展开状态下点击标题，是为了编辑，阻止冒泡以免触发折叠
        e.stopPropagation();
    }
}

function toggleTracker() {
    localData.value.hasTracker = !localData.value.hasTracker;
    if (localData.value.hasTracker) {
        if (!localData.value.uses) {
            localData.value.uses = { current: 0, max: 1 };
        }
    }
    updateData();
}

function onUsesInput() {
    if (localData.value.uses) {
        localData.value.uses.current = Math.max(0, Math.min(localData.value.uses.max, localData.value.uses.current));
    }
    updateData();
}

async function confirmRemove() {
    const confirmed = await api.ui.modals.confirm(
        t("ui.deleteConfirm", "Confirm Delete"),
        t("ui.deleteMessage", "Are you sure you want to delete {name}?").replace("{name}", localData.value.name || t("ui.unnamed", "Unnamed")),
        { yes: t("ui.confirmDelete", "Delete"), no: t("ui.cancel", "Cancel") }
    );
    if (confirmed) {
        emit('remove');
    }
}
</script>

<template>
    <div class="feature-item" :class="{ collapsed: isCollapsed }">
        <!-- 头部区域，点击切换折叠状态 -->
        <Tooltip placement="bottom" max-width="300px" max-height="400px"
            :disabled="!isCollapsed || !localData.description" style="width: 100%; display: block;">
            <div class="feature-header" @click="toggleCollapse">
                <input class="feature-title-input" v-model="localData.name" :readonly="isCollapsed"
                    @click="handleInputClick" @change="updateData"
                    :placeholder="t('ui.featureNamePlaceholder', 'Feature/Ability Name')" />

                <!-- Tracker 显示（折叠时也可见）：tracker名称（若与特性名不同）+ 使用次数 -->
                <div v-if="localData.hasTracker && localData.uses" class="uses-display" @click.stop>
                    <span v-if="localData.trackerName && localData.trackerName !== localData.name"
                        class="tracker-name-badge">{{ localData.trackerName }}</span>
                    <input type="number" class="uses-input" v-model.number="localData.uses.current"
                        @change="onUsesInput" min="0" :max="localData.uses.max" />
                    <span class="uses-separator">/</span>
                    <input type="number" class="uses-input" v-model.number="localData.uses.max" @change="onUsesInput"
                        min="0" />
                </div>
            </div>

            <template #content>
                <div class="feature-tooltip-content">
                    {{ localData.description }}
                </div>
            </template>
        </Tooltip>

        <!-- 展开后的主体内容 -->
        <div class="feature-body" v-show="!isCollapsed">
            <textarea class="feature-desc-input" v-model="localData.description" @change="updateData"
                :placeholder="t('ui.featureDescPlaceholder', 'Enter detailed description here...')"></textarea>

            <div class="feature-options">
                <label class="tracker-toggle" @click.stop>
                    <input type="checkbox" :checked="localData.hasTracker" @change="toggleTracker" />
                    <span>{{ t("ui.enableTracker", "Enable Tracker") }}</span>
                </label>
                <div v-if="localData.hasTracker" class="tracker-name-row" @click.stop>
                    <span class="tracker-name-label">{{ t("ui.trackerName", "Tracker Name") }}:</span>
                    <input class="tracker-name-input" v-model="localData.trackerName" @change="updateData"
                        :placeholder="localData.name" />
                </div>
            </div>

            <div class="feature-actions">
                <Button size="small" type="danger" @click="confirmRemove" :title="t('ui.delete', 'Delete')">
                    <template #icon>
                        <font-awesome-icon icon="fa-solid fa-trash-can" />
                    </template>
                </Button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.feature-item {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background-color: white;
    overflow: hidden;
    transition: box-shadow 0.2s;
}

.feature-item:hover {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.feature-header {
    padding: 0.4rem 0.6rem;
    background-color: #f9f9f9;
    cursor: pointer;
    display: flex;
    align-items: center;
    border-bottom: 1px solid transparent;
    transition: background-color 0.2s;
}

.feature-item:not(.collapsed) .feature-header {
    border-bottom-color: #e0e0e0;
    background-color: #f1f1f1;
}

.feature-title-input {
    font-size: 1rem;
    font-weight: bold;
    color: #333;
    border: 1px solid transparent;
    background: transparent;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    transition: all 0.2s;
    box-sizing: border-box;
    flex: 1;
    min-width: 0;
    max-width: 55%;
    margin-right: 0.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
}

.feature-title-input[readonly] {
    cursor: pointer;
    user-select: none;
}

.feature-title-input:not([readonly]):hover {
    background-color: rgba(255, 255, 255, 0.5);
    border-color: #e0e0e0;
}

.feature-title-input:not([readonly]):focus {
    background-color: white;
    border-color: #ff7052;
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 112, 82, 0.1);
}

/* Tracker name badge（uses-display 内部，当 tracker 名与特性名不同时显示） */
.tracker-name-badge {
    font-size: 0.75rem;
    color: #e65100;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60px;
    padding-right: 6px;
    margin-right: 4px;
    border-right: 1px solid rgba(255, 152, 0, 0.3);
    user-select: none;
}

/* Tracker uses display */
.uses-display {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 1;
    margin-left: auto;
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid rgba(255, 152, 0, 0.3);
    border-radius: 4px;
    padding: 0 4px;
    min-width: 0;
}

.uses-input {
    width: 32px;
    text-align: center;
    border: none;
    background: transparent;
    font-size: 0.9rem;
    font-weight: 600;
    color: #e65100;
    padding: 2px 0;
    -moz-appearance: textfield;
}

.uses-input::-webkit-outer-spin-button,
.uses-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.uses-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 2px;
}

.uses-separator {
    color: #999;
    font-weight: bold;
    font-size: 0.85rem;
    user-select: none;
}

.feature-body {
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.feature-desc-input {
    width: 100%;
    min-height: 80px;
    resize: vertical;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.5rem;
    font-size: 0.95rem;
    font-family: inherit;
    line-height: 1.4;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

.feature-desc-input:focus {
    outline: none;
    border-color: #ff7052;
}

.feature-options {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
}

.tracker-name-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: 1.2rem;
}

.tracker-name-label {
    font-size: 0.85rem;
    color: #777;
    white-space: nowrap;
}

.tracker-name-input {
    flex: 1;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.2rem 0.4rem;
    font-size: 0.85rem;
    transition: border-color 0.2s;
}

.tracker-name-input:focus {
    outline: none;
    border-color: #ff7052;
}

.tracker-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: #555;
    user-select: none;
}

.tracker-toggle input[type="checkbox"] {
    accent-color: #ff7052;
    cursor: pointer;
}

.feature-actions {
    display: flex;
    justify-content: flex-end;
}

.feature-tooltip-content {
    word-break: break-word;
    white-space: pre-wrap;
    line-height: 1.4;
}
</style>
