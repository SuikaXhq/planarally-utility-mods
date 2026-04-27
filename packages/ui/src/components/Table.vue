<script setup lang="ts" generic="T extends Record<string, any>">
import { ref } from 'vue';

export interface TableColumn<T = string> {
    key: keyof T | string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

const props = withDefaults(defineProps<{
    /** 表格标题 */
    title?: string;
    columns: TableColumn<T>[];
    data: T[];
    /** 是否允许通过点击表头折叠/展开表体 */
    collapsible?: boolean;
    /** 初始是否处于折叠状态（仅 collapsible 为 true 时生效） */
    defaultCollapsed?: boolean;
    /** 为行添加自定义 class */
    rowClass?: (row: T, index: number) => string | Record<string, boolean>;
}>(), {
    collapsible: false,
    defaultCollapsed: false,
});

const collapsed = ref(props.defaultCollapsed);

function toggleCollapse() {
    if (props.collapsible) {
        collapsed.value = !collapsed.value;
    }
}
</script>

<template>
    <div class="pa-ui-table-wrapper">
        <table class="pa-ui-table">
            <thead :class="{ 'is-collapsible': collapsible }" @click="toggleCollapse">
                <!-- 标题行：如果提供了 title，则显示该行 -->
                <tr v-if="title" class="title-row">
                    <th :colspan="columns.length">
                        <div class="th-content">
                            <span class="table-title-text">{{ title }}</span>
                            <font-awesome-icon v-if="collapsible" class="collapse-indicator"
                                :class="{ 'is-collapsed': collapsed }" icon="fa-solid fa-chevron-down" />
                        </div>
                    </th>
                </tr>
                <!-- 列名行：在未折叠时显示，或者在没有标题时作为折叠开关显示 -->
                <tr :class="{ 'is-hidden-row': collapsed && title }" class="header-row">
                    <th v-for="(col, colIndex) in columns" :key="col.key.toString()" class="column-header"
                        :style="{ width: col.width, textAlign: col.align || 'left' }">
                        <span class="th-content"
                            :style="{ justifyContent: col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start') }">
                            {{ col.label }}
                            <!-- 仅在没有全局标题且是第一列时显示折叠指示器 -->
                            <font-awesome-icon v-if="!title && collapsible && colIndex === 0" class="collapse-indicator"
                                :class="{ 'is-collapsed': collapsed }" icon="fa-solid fa-chevron-down" />
                        </span>
                    </th>
                </tr>
            </thead>
            <tbody :class="{ 'is-collapsed': collapsed }">
                <tr v-for="(row, rowIndex) in data" :key="rowIndex" :class="rowClass ? rowClass(row, rowIndex) : ''">
                    <td v-for="col in columns" :key="col.key.toString()" class="data-cell"
                        :style="{ textAlign: col.align || 'left' }">
                        <!-- 动态插槽，允许调用者自定义列的渲染 -->
                        <slot :name="col.key.toString()" :row="row" :index="rowIndex">
                            {{ row[col.key] }}
                        </slot>
                    </td>
                </tr>
                <tr v-if="data.length === 0">
                    <td :colspan="columns.length" class="empty-text">
                        <slot name="empty">暂无数据</slot>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<style scoped lang="scss">
.pa-ui-table-wrapper {
    background-color: white;
    border-radius: 8px;
    overflow: hidden; // 保证圆角能切掉内部直角
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
}

.pa-ui-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;

    th,
    td {
        padding: 0.2em 0.2em;
    }

    thead {
        background-color: brown;
        color: white;

        tr {
            background-color: inherit;
        }

        th {
            background-color: inherit;
            color: white;
            font-weight: bold;
            white-space: nowrap;
        }

        &.is-collapsible {
            cursor: pointer;
            user-select: none;
        }

        th {
            font-weight: bold;
        }

        .title-row {
            th {
                padding-top: 0.3em;
                padding-bottom: 0.3em;
                border-bottom: 1px solid rgba(255, 255, 255, 0.85);
            }
        }
    }

    tbody {
        &.is-collapsed {
            visibility: collapse;
        }

        tr {
            border-bottom: 1px solid #eee;
            transition: background-color 0.2s;

            &:hover {
                background-color: #f9f9f9;
            }

            &:last-child {
                border-bottom: none;
            }
        }
    }

    .is-hidden-row {
        visibility: collapse;
    }

    .empty-text {
        text-align: center;
        color: #999;
        padding: 2em;
        font-style: italic;
    }
}

.th-content {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    width: 100%;
}

.table-title-text {
    font-size: 1.1em;
    font-weight: bold;
    flex-grow: 1;
}

.collapse-indicator {
    display: inline-block;
    font-size: 0.9em;
    transition: transform 0.2s ease;
}

.collapse-indicator.is-collapsed {
    transform: rotate(90deg);
}
</style>
