<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useHistory } from '@/composables/useHistory';

const { groupedRecords, loadRecords } = useHistory();
const router = useRouter();
const visible = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let showTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
}

function show() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (showTimer) return; // already scheduled
    showTimer = setTimeout(() => {
        showTimer = null;
        if (!visible.value) {
            visible.value = true;
            loadRecords();
        }
    }, 80);
}

function toggle() {
    clearTimers();
    if (visible.value) {
        visible.value = false;
    } else {
        visible.value = true;
        loadRecords();
    }
}

function scheduleHide() {
    clearTimers();
    hideTimer = setTimeout(() => {
        visible.value = false;
    }, 200);
}

function close() {
    clearTimers();
    visible.value = false;
}

function onClickRecord(record: { vodId: string; vodName: string; currentEpisode: number; currentTime: number }) {
    close();
    router.push({
        name: 'search',
        query: {
            keyword: record.vodName,
            vodId: record.vodId,
            ep: String(record.currentEpisode),
            seek: String(Math.floor(record.currentTime)),
        },
    });
}
</script>

<template>
    <div class="history-panel-wrapper" @mouseenter="show" @mouseleave="scheduleHide">
        <button class="history-btn" @click="toggle" aria-label="播放历史">
            <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>

        <Transition name="history-fade">
            <div v-if="visible" class="history-popover">
                <div class="history-header">
                    <span class="history-title">播放历史</span>
                </div>
                <div class="history-body">
                    <template v-if="groupedRecords.length">
                        <div v-for="group in groupedRecords" :key="group.label" class="history-group">
                            <div class="group-label">{{ group.label }}</div>
                            <div
                                v-for="item in group.items"
                                :key="item.vodId"
                                class="history-item"
                                @click="onClickRecord(item)"
                            >
                                <div class="item-cover">
                                    <img :src="item.vodPic" :alt="item.vodName" loading="lazy" />
                                    <span class="item-badge">全{{ item.totalEpisodes }}集</span>
                                </div>
                                <div class="item-info">
                                    <div class="item-title">
                                        {{ item.vodName }}
                                        <span class="item-ep">第{{ item.currentEpisode + 1 < 10 ? '0' : '' }}{{ item.currentEpisode + 1 }}集</span>
                                    </div>
                                    <div class="item-progress">观看至{{ item.progress }}%</div>
                                </div>
                            </div>
                        </div>
                    </template>
                    <div v-else class="history-empty">暂无播放记录</div>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped lang="less">
.history-panel-wrapper {
    display: inline-flex;
    position: relative;
}

.history-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background-color 0.15s ease;

    svg {
        width: 24px;
        height: 24px;
    }

    &:hover {
        background: var(--bg-hover);
    }
}

.history-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 380px;
    max-height: 70vh;
    background: var(--bg-elevated);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
}

.history-header {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.history-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.history-body {
    overflow-y: auto;
    flex: 1;
    padding: 4px 0;
}

.group-label {
    padding: 8px 16px 4px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-tertiary);
}

.history-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
        background: var(--bg-hover);
    }
}

.item-cover {
    position: relative;
    flex-shrink: 0;
    width: 120px;
    height: 72px;
    border-radius: 6px;
    overflow: hidden;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .item-badge {
        position: absolute;
        left: 0;
        bottom: 0;
        padding: 2px 8px;
        font-size: 11px;
        color: #fff;
        background: rgba(0, 0, 0, 0.65);
        border-top-right-radius: 6px;
        line-height: 1.4;
    }
}

.item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.item-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;

    .item-ep {
        margin-left: 6px;
        font-weight: 400;
    }
}

.item-progress {
    font-size: 13px;
    color: var(--text-tertiary);
}

.history-empty {
    padding: 40px 16px;
    text-align: center;
    color: var(--text-tertiary);
    font-size: 14px;
}

/* Transition */
.history-fade-enter-active,
.history-fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.history-fade-enter-from,
.history-fade-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

/* Mobile */
@media screen and (max-width: 768px) {
    .history-popover {
        width: calc(100vw - 24px);
        right: -12px;
    }
}
</style>
