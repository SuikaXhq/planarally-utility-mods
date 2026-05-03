<script setup lang="ts">
import { Button } from '@planarally-mods/ui';
import FeatureItem from './FeatureItem.vue';
import type { RecordItem } from './data';
import { useI18n } from './utils/i18n';

const props = defineProps<{
    title: string;
    modelValue: RecordItem[];
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: RecordItem[]): void;
    (e: 'change'): void;
    (e: 'add'): void;
    (e: 'remove', index: number): void;
}>();

function onItemUpdate(index: number, value: RecordItem) {
    const updated = [...props.modelValue];
    updated[index] = value;
    emit('update:modelValue', updated);
    emit('change');
}

function onRemove(index: number) {
    emit('remove', index);
}

function onAdd() {
    emit('add');
}
</script>

<template>
    <section class="sheet-section">
        <div class="section-header">
            <h3 class="section-title">{{ title }}</h3>
            <Button size="small" @click="onAdd">+</Button>
        </div>
        <div class="record-list">
            <FeatureItem
                v-for="(item, i) in modelValue"
                :key="item.id"
                :modelValue="modelValue[i]"
                @update:modelValue="onItemUpdate(i, $event)"
                @change="$emit('change')"
                @remove="onRemove(i)"
            />
        </div>
    </section>
</template>

<style scoped>
.sheet-section {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
    width: 100%;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.section-title {
    margin: 0;
    color: #2c3e50;
    font-size: 1.1rem;
    font-weight: bold;
    border-left: 4px solid #ff7052;
    padding-left: 0.5rem;
}

.record-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>
