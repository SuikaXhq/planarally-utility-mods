<script setup lang="ts">
import { DiceButton } from "@planarally-mods/ui";
import { formatSign } from "./data";

const props = defineProps<{
    modifier: number;
    expression?: string;
}>();

const emit = defineEmits<{
    (e: "roll", expr: string): void;
}>();

function handleRoll() {
    emit("roll", props.expression || "");
}
</script>

<template>
    <div class="mod-cell" @click.stop="handleRoll">
        <span class="mod-badge" :class="{ positive: modifier >= 0, negative: modifier < 0 }">
            {{ formatSign(modifier) }}
        </span>
        <DiceButton @roll="handleRoll" class="skill-dice-btn" />
    </div>
</template>

<style scoped>
.mod-cell {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
}

.mod-badge {
    font-weight: bold;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    min-width: 2rem;
    text-align: center;
    font-size: 0.9rem;
}

.mod-badge.positive {
    background-color: #e8f5e9;
    color: #2e7d32;
}

.mod-badge.negative {
    background-color: #ffebee;
    color: #c62828;
}

.skill-dice-btn {
    border: none;
    background: transparent;
    padding: 0;
}

:deep(.pa-ui-dice-button .dice-icon) {
    font-size: 0.85rem;
    opacity: 0.3;
}

.mod-cell:hover :deep(.pa-ui-dice-button .dice-icon) {
    opacity: 0.8;
}
</style>
