<script setup lang="ts">
const props = withDefaults(defineProps<{
    type?: 'primary' | 'secondary' | 'danger' | 'ghost';
    disabled?: boolean;
    block?: boolean;
}>(), {
    type: 'primary',
    disabled: false,
    block: false,
});

const emit = defineEmits<{
    (e: 'click', event: MouseEvent): void
}>();

function onClick(event: MouseEvent) {
    if (!props.disabled) {
        emit('click', event);
    }
}
</script>

<template>
    <button class="pa-ui-button" :class="[`pa-ui-button--${type}`, { 'is-disabled': disabled, 'is-block': block }]"
        :disabled="disabled" @click="onClick">
        <slot name="icon"></slot>
        <slot></slot>
    </button>
</template>

<style scoped lang="scss">
.pa-ui-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5em 0.5em;
    font-size: 1rem;
    font-family: inherit;
    text-transform: uppercase;
    font-weight: 600;
    cursor: pointer;
    border-radius: 4px;
    border: 1px solid transparent;
    transition: all 0.2s ease-in-out;
    user-select: none;

    /* PlanarAlly 常见的按钮阴影样式 */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

    &:hover {
        opacity: 0.9;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    &:active {
        transform: translateY(1px);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    &.is-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;

        &:hover {
            transform: none;
            box-shadow: none;
            opacity: 0.5;
        }
    }

    &.is-block {
        width: 100%;
        display: flex;
    }

    /* 主按钮：PlanarAlly 标志性深红色 */
    &--primary {
        background-color: rgba(219, 0, 59, 1);
        color: white;
        border-color: rgba(219, 0, 59, 1);
    }

    /* 次按钮：浅色背景配合深色文字 */
    &--secondary {
        background-color: #f9f9f9;
        color: #333;
        border-color: #ccc;
    }

    /* 危险按钮/警告：确认框常用的橙红色 */
    &--danger {
        background-color: #ff7052;
        color: white;
        border-color: #ff7052;
    }

    /* 幽灵按钮：无背景无边框，常用于工具栏或图标按钮 */
    &--ghost {
        background-color: transparent;
        color: rgba(219, 0, 59, 1);
        border-color: transparent;
        box-shadow: none;

        &:hover {
            background-color: rgba(219, 0, 59, 0.1);
            box-shadow: none;
        }
    }
}
</style>
