<script setup lang="ts">
import { ref, watch } from 'vue';
import { getList, type IVodItem } from '@/api';

const searchText = ref('');
const suggestions = ref<IVodItem[]>([]);
const showDropdown = ref(false);
const searching = ref(false);
const activeIndex = ref(-1);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const props = defineProps<{ text?: string; compact?: boolean }>();
const emit = defineEmits<{
    (e: 'submit', text: string): void;
}>();

watch(
    () => props.text,
    (text = '') => (searchText.value = text),
    { immediate: true },
);

const fetchSuggestions = async (keyword: string) => {
    if (!keyword.trim()) {
        suggestions.value = [];
        showDropdown.value = false;
        searching.value = false;
        return;
    }
    searching.value = true;
    showDropdown.value = true;
    try {
        const result = await getList(keyword);
        searching.value = false;
        if (result.code === 1 && result.list.length > 0) {
            suggestions.value = result.list.slice(0, 8);
        } else {
            suggestions.value = [];
            showDropdown.value = false;
        }
    } catch {
        searching.value = false;
        suggestions.value = [];
        showDropdown.value = false;
    }
};

const onInput = () => {
    activeIndex.value = -1;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchSuggestions(searchText.value);
    }, 200);
};

const submit = () => {
    showDropdown.value = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    emit('submit', searchText.value);
};

const selectItem = (item: IVodItem) => {
    searchText.value = item.vod_name;
    showDropdown.value = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    emit('submit', item.vod_name);
};

const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (showDropdown.value && activeIndex.value >= 0) {
            selectItem(suggestions.value[activeIndex.value]);
        } else {
            submit();
        }
        return;
    }
    if (!showDropdown.value || !suggestions.value.length) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex.value = (activeIndex.value + 1) % suggestions.value.length;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
    } else if (e.key === 'Escape') {
        showDropdown.value = false;
    }
};

const onBlur = () => {
    // Delay to allow click on dropdown item to fire first
    setTimeout(() => {
        showDropdown.value = false;
    }, 200);
};
</script>

<template>
    <div class="search-input-wrapper" :class="{ compact }">
        <svg class="search-icon-left" viewBox="0 0 24 24" fill="none">
            <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <input
            class="search-input"
            type="text"
            v-model="searchText"
            placeholder="搜索影视..."
            @input="onInput"
            @keydown="onKeydown"
            @blur="onBlur"
            @focus="suggestions.length && (showDropdown = true)"
        />
        <button class="search-btn" @click="submit" aria-label="搜索">
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>

        <div class="search-dropdown" v-show="showDropdown">
            <div class="dropdown-loading" v-if="searching">
                <span class="loading-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
                <span class="loading-text">搜索中</span>
            </div>
            <template v-else>
                <div
                    class="dropdown-item"
                    v-for="(item, index) in suggestions"
                    :key="item.vod_id"
                    :class="{ active: index === activeIndex }"
                    @mousedown.prevent="selectItem(item)"
                    @mouseenter="activeIndex = index"
                >
                    <span class="item-name">{{ item.vod_name }}</span>
                    <span class="item-meta">
                        <span class="item-type">{{ item.type_name }}</span>
                        <span class="item-remarks">{{ item.vod_remarks }}</span>
                    </span>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped lang="less">
.search-input-wrapper {
    position: relative;
    width: 100%;
    max-width: 580px;
    height: 48px;
    display: flex;
    align-items: center;
    border: 1px solid var(--search-border);
    border-radius: 24px;
    padding: 0 8px 0 16px;
    background: var(--search-bg);
    transition: box-shadow 0.2s ease, border-color 0.2s ease;

    &:hover {
        box-shadow: var(--shadow-md);
        border-color: transparent;
    }

    &:focus-within {
        box-shadow: var(--shadow-md);
        border-color: transparent;
    }

    &.compact {
        height: 40px;
        border-radius: 20px;
        max-width: none;
        padding: 0 16px;

        .search-icon-left {
            width: 16px;
            height: 16px;
        }

        .search-input {
            font-size: 14px;
        }

        .search-btn {
            display: none;
        }
    }

    .search-icon-left {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        color: var(--text-secondary);
        margin-right: 12px;
    }

    .search-input {
        flex: 1;
        height: 100%;
        background: transparent;
        border: none;
        outline: none;
        font-size: 16px;
        color: var(--text-primary);
        line-height: 1;

        &::placeholder {
            color: var(--text-tertiary);
        }
    }

    .search-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: var(--btn-primary-bg);
        cursor: pointer;
        transition: background-color 0.15s ease;
        margin-left: 4px;

        svg {
            width: 20px;
            height: 20px;
        }

        &:hover {
            background: var(--bg-hover);
        }
    }

    .search-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        background: var(--search-bg, #fff);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        z-index: 1000;

        .dropdown-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 16px;

            .loading-dots {
                display: flex;
                gap: 4px;

                .dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--text-tertiary);
                    animation: dot-bounce 1.2s ease-in-out infinite;

                    &:nth-child(2) { animation-delay: 0.2s; }
                    &:nth-child(3) { animation-delay: 0.4s; }
                }
            }

            .loading-text {
                font-size: 13px;
                color: var(--text-tertiary);
            }
        }

        .dropdown-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            cursor: pointer;
            transition: background-color 0.1s ease;

            &:hover,
            &.active {
                background: var(--bg-hover);
            }

            .item-name {
                flex: 1;
                font-size: 14px;
                color: var(--text-primary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                margin-right: 12px;
            }

            .item-meta {
                flex-shrink: 0;
                display: flex;
                align-items: center;
                gap: 8px;

                .item-type,
                .item-remarks {
                    font-size: 12px;
                    color: var(--text-tertiary);
                }

                .item-remarks {
                    color: var(--text-secondary);
                }
            }
        }
    }

    @media screen and (max-width: 768px) {
        &.compact {
            height: 36px;
            border-radius: 18px;
            padding: 0 12px;

            .search-icon-left {
                width: 14px;
                height: 14px;
                margin-right: 6px;
            }

            .search-btn {
                display: none;
            }
        }
    }
}

@keyframes dot-bounce {
    0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.4;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}
</style>
