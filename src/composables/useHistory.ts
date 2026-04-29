import { ref, computed } from 'vue';
import type { IHistoryRecord } from './useHistoryDB';
import { putRecord, getRecentRecords, getAllRecords } from './useHistoryDB';

const records = ref<IHistoryRecord[]>([]);
const showAll = ref(false);
const DEFAULT_LIMIT = 10;

function getDateLabel(timestamp: number): string {
    const now = new Date();
    const date = new Date(timestamp);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    if (timestamp >= todayStart) return '今天';
    if (timestamp >= yesterdayStart) return '昨天';
    return '更早';
}

export interface IGroupedRecords {
    label: string;
    items: IHistoryRecord[];
}

export function useHistory() {
    const groupedRecords = computed<IGroupedRecords[]>(() => {
        const groups: Record<string, IHistoryRecord[]> = {};
        const order: string[] = [];
        for (const r of records.value) {
            const label = getDateLabel(r.updatedAt);
            if (!groups[label]) {
                groups[label] = [];
                order.push(label);
            }
            groups[label].push(r);
        }
        return order.map((label) => ({ label, items: groups[label] }));
    });

    const hasMore = computed(() => !showAll.value);

    async function loadRecords() {
        showAll.value = false;
        records.value = await getRecentRecords(DEFAULT_LIMIT);
    }

    async function loadAll() {
        records.value = await getAllRecords();
        showAll.value = true;
    }

    async function saveProgress(data: {
        vodId: string;
        vodName: string;
        vodPic: string;
        totalEpisodes: number;
        currentEpisode: number;
        currentTime: number;
        duration: number;
    }) {
        const progress = data.duration > 0 ? Math.round((data.currentTime / data.duration) * 100) : 0;
        const record: IHistoryRecord = {
            ...data,
            progress,
            updatedAt: Date.now(),
        };
        await putRecord(record);
    }

    return {
        records,
        groupedRecords,
        hasMore,
        loadRecords,
        loadAll,
        saveProgress,
    };
}
