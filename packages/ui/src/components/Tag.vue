<script setup lang="ts">
defineProps<{
    label: string;
    closable?: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();
</script>

<template>
    <span class="pa-ui-tag">
        {{ label }}
        <span v-if="closable" class="remove-btn" @click.stop="emit('close')">&times;</span>
    </span>
</template>

<style scoped lang="scss">
.pa-ui-tag {
    display: inline-flex;
    align-items: center;
    background: #f0f0f0;
    color: #333;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 0.8rem;
    gap: 3px;
    border: 1px solid #e0e0e0;
    white-space: nowrap;

    .remove-btn {
        cursor: pointer;
        color: #999;
        font-weight: bold;
        font-size: 0.9rem;
        line-height: 1;

        &:hover {
            color: #ff7052;
        }
    }
}
</style>
