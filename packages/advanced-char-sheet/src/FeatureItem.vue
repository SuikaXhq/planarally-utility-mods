<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button } from '@planarally-mods/ui';
import type { RecordItem } from './data';
import { useI18n } from './utils/i18n';

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
const localData = ref({ ...props.modelValue });

const { t } = useI18n();

// 同步外部变化
watch(() => props.modelValue, (newVal) => {
    localData.value = { ...newVal };
}, { deep: true });

function updateData() {
    emit('update:modelValue', localData.value);
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
</script>

<template>
    <div class="feature-item" :class="{ collapsed: isCollapsed }">
        <!-- 头部区域，点击切换折叠状态 -->
        <div class="feature-header" @click="toggleCollapse">
            <input 
                class="feature-title-input" 
                v-model="localData.name" 
                :readonly="isCollapsed"
                @click="handleInputClick"
                @change="updateData"
                :placeholder="t('ui.featureNamePlaceholder', 'Feature/Ability Name')"
                :title="isCollapsed ? t('ui.clickToExpand', 'Click to expand') : t('ui.clickToEdit', 'Click to edit')"
            />
            <!-- 未来扩展槽：开关、使用次数追踪器等可以在这里插入 -->
            <!-- <div class="feature-header-extensions">...</div> -->
        </div>
        
        <!-- 展开后的主体内容 -->
        <div class="feature-body" v-show="!isCollapsed">
            <textarea 
                class="feature-desc-input" 
                v-model="localData.description" 
                @change="updateData"
                :placeholder="t('ui.featureDescPlaceholder', 'Enter detailed description here...')"
            ></textarea>
            
            <!-- 未来扩展槽：掷骰选项等可以放在这里 -->
            <!-- <div class="feature-body-extensions">...</div> -->
            
            <div class="feature-actions">
                <Button size="small" type="danger" @click="$emit('remove')" :title="t('ui.delete', 'Delete')">
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
    /* 限制宽度，为右侧留出足够的空白点击区域，防误触 */
    box-sizing: border-box;
    width: 65%;
    margin-right: auto;
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

.feature-actions {
    display: flex;
    justify-content: flex-end;
}
</style>
