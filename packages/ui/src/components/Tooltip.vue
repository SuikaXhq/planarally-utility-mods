<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = withDefaults(defineProps<{
    /** 气泡弹出方向 */
    placement?: 'top' | 'bottom' | 'left' | 'right';
    /** 宽度 */
    width?: string;
    /** 高度 */
    height?: string;
    /** 最大宽度 */
    maxWidth?: string;
    /** 最大高度 */
    maxHeight?: string;
    /** 是否禁用 */
    disabled?: boolean;
}>(), {
    placement: 'top',
    disabled: false,
});

const isVisible = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const position = ref({ top: 0, left: 0 });
let hideTimer: number | null = null;

const tooltipStyle = computed(() => ({
    top: `${position.value.top}px`,
    left: `${position.value.left}px`,
    width: props.width || 'max-content',
    height: props.height,
    maxWidth: props.maxWidth,
    maxHeight: props.maxHeight,
    whiteSpace: (props.width || props.maxWidth) ? 'normal' : 'nowrap' as const,
    overflow: (props.height || props.maxHeight) ? 'auto' : 'visible' as const,
    position: 'fixed' as const,
    zIndex: 9999,
}));

function updatePosition() {
    if (!triggerRef.value) return;
    const rect = triggerRef.value.getBoundingClientRect();
    let top = 0;
    let left = 0;
    const gap = 8;

    // 初始位置设置在 trigger 中心，之后根据方向偏移
    switch (props.placement) {
        case 'top':
            top = rect.top - gap;
            left = rect.left + rect.width / 2;
            break;
        case 'bottom':
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2;
            break;
        case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - gap;
            break;
        case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + gap;
            break;
    }
    position.value = { top, left };
}

function show() {
    if (props.disabled) return;
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
    isVisible.value = true;
    updatePosition();
}

function hide() {
    // 延迟隐藏，给鼠标留出移动到气泡内部的时间
    hideTimer = window.setTimeout(() => {
        isVisible.value = false;
        hideTimer = null;
    }, 100);
}

// 监听内容变化，确保位置和背景实时更新
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    resizeObserver = new ResizeObserver(() => {
        if (isVisible.value) updatePosition();
    });
});

onUnmounted(() => {
    window.removeEventListener('resize', updatePosition);
    window.removeEventListener('scroll', updatePosition, true);
    resizeObserver?.disconnect();
});

watch(isVisible, (val) => {
    if (val) {
        setTimeout(() => {
            updatePosition();
            if (tooltipRef.value) resizeObserver?.observe(tooltipRef.value);
        }, 0);
    } else {
        resizeObserver?.disconnect();
    }
});
</script>

<template>
    <div 
        ref="triggerRef" 
        class="pa-ui-tooltip-wrapper"
        @mouseenter="show"
        @mouseleave="hide"
    >
        <slot></slot>
        
        <Teleport to="body">
            <Transition name="fade">
                <div 
                    v-if="isVisible"
                    ref="tooltipRef" 
                    class="pa-ui-tooltip" 
                    :class="`pa-ui-tooltip--${placement}`"
                    :style="tooltipStyle"
                    @mouseenter="show"
                    @mouseleave="hide"
                >
                    <slot name="content"></slot>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped lang="scss">
.pa-ui-tooltip-wrapper {
    position: relative;
    display: inline-flex;
}

.pa-ui-tooltip {
    position: fixed;
    background-color: #333;
    color: #fff;
    font-size: 0.75rem;
    font-weight: normal;
    padding: 8px 12px;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    pointer-events: auto; /* 允许在气泡内操作（如备注输入） */

    /* 箭头样式（使用 transform 居中） */
    &::after {
        content: "";
        position: absolute;
        border: 5px solid transparent;
    }

    &--top {
        transform: translate(-50%, -100%);
        &::after {
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-top-color: #333;
        }
    }

    &--bottom {
        transform: translate(-50%, 0);
        &::after {
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-bottom-color: #333;
        }
    }

    &--left {
        transform: translate(-100%, -50%);
        &::after {
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-left-color: #333;
        }
    }

    &--right {
        transform: translate(0, -50%);
        &::after {
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-right-color: #333;
        }
    }
}

.fade-enter-active, .fade-leave-active {
    transition: opacity 0.15s ease;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
}
</style>
