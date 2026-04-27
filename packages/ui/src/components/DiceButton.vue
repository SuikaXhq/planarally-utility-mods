<script setup lang="ts">
import { computed } from 'vue';

export interface DiceSegment {
    text: string;
    isVariable?: boolean;
    value?: string | number;
}

const props = defineProps<{
    segments?: DiceSegment[];
    expression?: string; // If no segments provided, just display this
}>();

const emit = defineEmits<{
    (e: 'roll', expression: string): void
}>();

const hasText = computed(() => {
    if (props.expression) return true;
    if (props.segments && props.segments.length > 0) return true;
    return false;
});

function onRoll(event: Event) {
    event.stopPropagation();
    let expr = props.expression;
    if (!expr && props.segments) {
        expr = props.segments.map(s => s.text).join("");
    }
    emit('roll', expr || "");
}
</script>

<template>
    <div 
        class="pa-ui-dice-button" 
        :class="{ 'icon-only': !hasText }"
        @click="onRoll"
    >
        <template v-if="segments">
            <template v-for="(segment, index) of segments" :key="index">
                <span
                    v-if="segment.isVariable"
                    class="variable"
                    :class="{ unknown: segment.value === undefined }"
                    :title="segment.value?.toString() ?? 'Unknown'"
                >
                    {{ segment.text }}
                </span>
                <span v-else>{{ segment.text }}</span>
            </template>
        </template>
        <template v-else-if="expression">
            <span>{{ expression }}</span>
        </template>
        
        <font-awesome-icon class="dice-icon" icon="fa-solid fa-dice-d20" />
    </div>
</template>

<style scoped lang="scss">
.pa-ui-dice-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid #ccc;
    background-color: #eee;
    user-select: none;
    transition: transform 0.2s;

    &:hover {
        transform: scale(1.1);
    }

    &:active {
        transform: scale(0.95);
    }

    &.icon-only {
        padding: 0.25rem;
        justify-content: center;
        
        .dice-icon {
            margin-left: 0;
        }
    }
}

.variable {
    background-color: rgba(255, 168, 191, 0.5);
    padding: 0.1rem 0.25rem;
    margin: 0 0.1rem;
    border-radius: 0.25rem;
    font-weight: bold;

    &.unknown {
        text-decoration: line-through;
    }
}

.dice-icon {
    color: #890025; /* PA DiceFormat color */
    margin-left: 0.25rem;
}
</style>
