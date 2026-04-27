<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import Tag from './Tag.vue';

const props = defineProps<{
    modelValue: string[];
    suggestions?: string[];
    placeholder?: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string[]): void;
}>();

const inputValue = ref('');
const inputRef = ref<HTMLInputElement | null>(null);
const wrapperRef = ref<HTMLDivElement | null>(null);
const isFocused = ref(false);
const dropdownStyle = ref({ top: '0', left: '0', width: 'auto' });

function updateDropdownPosition() {
    if (wrapperRef.value) {
        const rect = wrapperRef.value.getBoundingClientRect();
        dropdownStyle.value = {
            top: `${rect.bottom + 4}px`, // Fixed positioning relative to viewport handles scrolling better if body isn't scrolling, but if it is, absolute + scroll is needed. Wait, Teleport to body. Let's use position: fixed so it stays with the input even if scrolled inside a scrollable container.
            left: `${rect.left}px`,
            width: `${rect.width}px`
        };
    }
}

function handleFocus() {
    isFocused.value = true;
    updateDropdownPosition();
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
}

function handleBlur() {
    isFocused.value = false;
    window.removeEventListener('scroll', updateDropdownPosition, true);
    window.removeEventListener('resize', updateDropdownPosition);
}

onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateDropdownPosition, true);
    window.removeEventListener('resize', updateDropdownPosition);
});

const availableSuggestions = computed(() => {
    if (!props.suggestions) return [];
    const currentTags = new Set(props.modelValue);
    return props.suggestions.filter(s => !currentTags.has(s) && s.toLowerCase().includes(inputValue.value.toLowerCase()));
});

function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !props.modelValue.includes(trimmed)) {
        emit('update:modelValue', [...props.modelValue, trimmed]);
    }
    inputValue.value = '';
    // After adding, focus stays, so update position if it wraps and changes height
    setTimeout(updateDropdownPosition, 0);
}

function removeTag(index: number) {
    const newTags = [...props.modelValue];
    newTags.splice(index, 1);
    emit('update:modelValue', newTags);
    setTimeout(updateDropdownPosition, 0);
}

function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',' || event.key === '，') {
        event.preventDefault();
        addTag(inputValue.value);
    } else if (event.key === 'Backspace' && !inputValue.value && props.modelValue.length > 0) {
        removeTag(props.modelValue.length - 1);
    }
    setTimeout(updateDropdownPosition, 0);
}

function focusInput() {
    inputRef.value?.focus();
}
</script>

<template>
    <div class="pa-ui-tag-input" :class="{ focused: isFocused }" @click="focusInput" ref="wrapperRef">
        <div class="tags-container">
            <Tag v-for="(tag, index) in modelValue" :key="index" :label="tag" closable @close="removeTag(index)" />
            <input ref="inputRef" v-model="inputValue" type="text" class="tag-field"
                :placeholder="modelValue.length === 0 ? placeholder : ''" @keydown="onInputKeydown" @focus="handleFocus"
                @blur="handleBlur" @input="updateDropdownPosition" />
        </div>

        <Teleport to="body">
            <div v-if="isFocused && availableSuggestions.length > 0" class="pa-ui-tag-suggestions-dropdown"
                :style="dropdownStyle">
                <div v-for="suggestion in availableSuggestions" :key="suggestion" class="suggestion-item"
                    @mousedown.prevent="addTag(suggestion)">
                    {{ suggestion }}
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped lang="scss">
.pa-ui-tag-input {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    position: relative;
    min-height: 32px;
    cursor: text;
    transition: all 0.2s;
    box-sizing: border-box;
    width: 100%;

    &.focused {
        border-color: #ff7052;
        box-shadow: 0 0 0 2px rgba(255, 112, 82, 0.1);
    }

    .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        width: 100%;
    }

    .tag-field {
        border: none;
        outline: none;
        flex: 1 1 50px;
        /* Allow growing to fill remaining space, prevents unnecessary wrapping */
        min-width: 50px;
        width: 100%;
        height: 24px;
        font-size: 0.95rem;
        padding: 0 4px;
        background: transparent;
    }
}

/* 提示框样式移出，因为它被 Teleport 到了 body */
.pa-ui-tag-suggestions-dropdown {
    position: fixed;
    /* 使用 fixed 定位，因为我们的 top/left 是相对于视口的 */
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 99999;
    max-height: 150px;
    overflow-y: auto;

    .suggestion-item {
        padding: 6px 12px;
        cursor: pointer;
        font-size: 0.9rem;

        &:hover {
            background: #fff5f2;
            color: #ff7052;
        }
    }
}
</style>
