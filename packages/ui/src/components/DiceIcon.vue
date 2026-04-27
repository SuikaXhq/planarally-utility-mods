<script setup lang="ts">
/**
 * 一个遵循 PlanarAlly 风格的骰子图标组件。
 * 默认使用 d20 图标，并采用 PA 特有的深红色 (#890025)。
 */
defineProps<{
    icon?: string;
    size?: string;
}>();
</script>

<template>
    <font-awesome-icon 
        class="pa-ui-dice-icon" 
        :icon="icon || 'fa-solid fa-dice-d20'" 
        :style="{ fontSize: size }"
    />
</template>

<style scoped lang="scss">
.pa-ui-dice-icon {
    color: #890025; /* PA DiceFormat color: rgba(137, 0, 37, 1) */
    cursor: pointer;
    transition: transform 0.1s ease-in-out;

    &:hover {
        transform: scale(1.1);
        filter: brightness(1.2);
    }

    &:active {
        transform: scale(0.95);
    }
}
</style>
