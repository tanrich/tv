<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Tag, Card, Spin, Page, Exception } from 'view-ui-plus';
import SearchComponent from '../components/SearchComponent.vue';
import { createEmptyDetailData } from '@/common/util';
import { getDetail, getList, type IDetailData, type IResponseData, type IVodItem } from '@/api';
import DetailView from '@/components/DetailView.vue';
import HistoryPanel from '@/components/HistoryPanel.vue';
import { useTheme } from '@/composables/useTheme';

const router = useRouter();
const route = useRoute();
const { isDark, toggleTheme } = useTheme();
const wd = ref('');
const data = reactive<{
    pageData: IResponseData<IVodItem>;
    detailData: IDetailData;
}>({
    pageData: {
        page: 1,
        pagecount: 1,
        limit: 10,
        total: 0,
        list: [],
    },
    detailData: createEmptyDetailData(),
});
const isLoading = ref(false);
const hasSearched = ref(false);
const isShowDetailPage = computed(() => !!data.detailData.vod_id);
const autoIFrame = ref();
const isShowAuthValidate = ref(false);

// Mobile detection
const isMobile = ref(false);
const showDetail = ref(false);
let mql: MediaQueryList | null = null;
const handleMqlChange = (e: MediaQueryListEvent | MediaQueryList) => {
    isMobile.value = e.matches;
    if (!e.matches) {
        showDetail.value = false;
    }
};

onMounted(() => {
    mql = window.matchMedia('(max-width: 768px)');
    handleMqlChange(mql);
    mql.addEventListener('change', handleMqlChange as (e: MediaQueryListEvent) => void);
});

onBeforeUnmount(() => {
    mql?.removeEventListener('change', handleMqlChange as (e: MediaQueryListEvent) => void);
});

onBeforeMount(() => {
    watch(
        () => route.query.keyword,
        (keyword) => {
            wd.value = keyword?.toString() ?? '';
            updateList();
        },
        { immediate: true },
    );
    // Restore detail from query on page load
    const vodId = route.query.vodId?.toString();
    if (vodId) {
        const ep = route.query.ep !== undefined ? parseInt(route.query.ep as string) : undefined;
        const seek = route.query.seek !== undefined ? parseInt(route.query.seek as string) : undefined;
        updateDetail(vodId, ep, seek);
    }
});

async function showLoading<T>(cb: () => Promise<T>) {
    isLoading.value = true;
    const res = await cb();
    isLoading.value = false;
    return res;
}

const updateList = async (page?: number) => {
    showLoading(async () => {
        const result = await getList(wd.value, page);
        hasSearched.value = true;
        if (result.code !== 1) {
            isShowAuthValidate.value = true;
            nextTick(() => {
                autoIFrame.value.contentDocument.write(result.redirectHtmlData);
            });
            return;
        }

        data.pageData = {
            page: result.page,
            pagecount: result.pagecount,
            limit: result.limit,
            total: result.total,
            list: result.list,
        };
        nextTick(() => scrollToSelected());
    });
};
const updateQuery = (keyword: string) => {
    router.replace({ query: { keyword, vodId: route.query.vodId } });
};
const detailViewRef = ref<InstanceType<typeof DetailView>>();
const detailWrapperRef = ref<HTMLElement>();
const listWrapperRef = ref<HTMLElement>();

const scrollToSelected = () => {
    const el = listWrapperRef.value?.querySelector('.list-item.selected') as HTMLElement | null;
    if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
};

const updateDetail = async (vodId: string, ep?: number, seek?: number) => {
    // Sync vodId to query
    router.replace({ query: { ...route.query, vodId } });
    await showLoading(async () => {
        const result = await getDetail(vodId);
        const regex = /https:\/\/.*?\.m3u8/g;
        data.detailData = result.list[0];
        data.detailData.vod_play_url_parse = data.detailData.vod_play_url.match(regex) ?? [];
    });
    if (isMobile.value) {
        showDetail.value = true;
    }
    // Scroll detail area to top
    nextTick(() => {
        detailWrapperRef.value?.scrollTo(0, 0);
        detailViewRef.value?.fetchDanmaku();
        // Auto-play from history record
        if (ep !== undefined && ep >= 0 && data.detailData.vod_play_url_parse[ep]) {
            const src = data.detailData.vod_play_url_parse[ep];
            detailViewRef.value?.playVideo(src, ep, seek);
            // Scroll detail area to player position (delay for DOM render)
            setTimeout(() => {
                const wrapper = detailWrapperRef.value;
                const videoEl = wrapper?.querySelector('.video-wrapper') as HTMLElement | null;
                if (wrapper && videoEl) {
                    const wrapperRect = wrapper.getBoundingClientRect();
                    const videoRect = videoEl.getBoundingClientRect();
                    wrapper.scrollTo({
                        top: wrapper.scrollTop + videoRect.top - wrapperRect.top,
                        behavior: 'smooth',
                    });
                }
            }, 300);
            // Clean up ep/seek from query to avoid re-seek on refresh
            router.replace({ query: { keyword: route.query.keyword, vodId } });
        }
    });
};
const goBack = () => {
    showDetail.value = false;
    router.replace({ query: { keyword: route.query.keyword } });
};
const goHome = () => {
    router.push({ name: 'home' });
};
</script>

<template>
    <div class="search-view">
        <div class="header">
            <h1 class="header-logo" @click="goHome">richBox</h1>
            <div class="header-search">
                <SearchComponent :text="wd" compact @submit="updateQuery" />
            </div>
            <button class="theme-toggle" @click="toggleTheme" :aria-label="isDark ? '切换到亮色模式' : '切换到暗黑模式'">
                <svg v-if="isDark" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <HistoryPanel />
        </div>
        <div class="container" v-show="data.pageData.total">
            <div
                ref="listWrapperRef"
                :class="{ 'list-wrapper': true, 'min-list-wrapper': isShowDetailPage }"
                v-show="!isMobile || !showDetail"
            >
                <div
                    :class="{ 'list-item': true, selected: item.vod_id === data.detailData.vod_id }"
                    v-for="item in data.pageData.list"
                    :key="item.vod_id"
                    @click="updateDetail(item.vod_id)"
                >
                    <Card :title="item.vod_name">
                        <div class="list-item-type">
                            <Tag>{{ item.type_name }}</Tag>
                            <Tag color="blue">{{ item.vod_remarks }}</Tag>
                        </div>
                    </Card>
                </div>
                <Page
                    v-show="data.pageData.total"
                    v-model="data.pageData.page"
                    :total="data.pageData.total"
                    :page-size="data.pageData.limit"
                    @on-change="(page: number) => updateList(page)"
                />
            </div>
            <div
                ref="detailWrapperRef"
                class="detail-wrapper"
                v-show="!isMobile || showDetail"
                v-if="isShowDetailPage"
            >
                <button v-if="isMobile" class="back-btn" @click="goBack">
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                        <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    返回列表
                </button>
                <Card>
                    <DetailView ref="detailViewRef" :data="data.detailData" />
                </Card>
            </div>
        </div>
        <Exception
            v-show="hasSearched && !data.pageData.total && !isLoading"
            class="exception"
            type="403"
            title="哦豁"
            desc="什么也没搜到"
            img-color
        >
            <template v-slot:actions><span></span></template>
        </Exception>
        <div class="loading" v-show="isLoading">
            <Spin fix size="large"></Spin>
        </div>
        <div class="auth-validate" v-if="isShowAuthValidate">
            <p>提交验证信息后，请手动刷新页面</p>
            <iframe class="auth-iframe" ref="autoIFrame" frameborder="0"></iframe>
        </div>
    </div>
</template>

<style lang="less">
.search-view {
    overflow: hidden;
    min-height: 100vh;
    background-color: var(--bg-primary);
    transition: background-color 0.3s ease;

    .header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        padding: 10px 24px;
        z-index: 999;
        background-color: var(--bg-elevated);
        border-bottom: 1px solid var(--divider);
        transition: background-color 0.3s ease, border-color 0.3s ease;
        gap: 16px;

        .header-logo {
            flex-shrink: 0;
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 0px;
            font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            cursor: pointer;
            user-select: none;
            line-height: 1;
        }

        .header-search {
            flex: 1;
            max-width: 640px;
            margin: 0 auto;
        }

        .theme-toggle {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border: none;
            border-radius: 50%;
            background: transparent;
            color: var(--text-secondary);
            cursor: pointer;
            transition: background-color 0.15s ease;

            svg {
                width: 20px;
                height: 20px;
            }

            &:hover {
                background: var(--bg-hover);
            }
        }
    }

    .exception {
        height: 100vh;
    }

    .loading {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99;
    }

    .container {
        position: relative;
        padding: 74px 80px 0;
        display: flex;
        justify-content: center;
        overflow: hidden;
        height: 100vh;

        .list-wrapper {
            flex: 0 0 656px;
            margin: 10px 0;
            box-sizing: border-box;
            transition: all 0.3s ease;
            overflow-y: auto;
            padding-bottom: 40px;

            .list-item {
                margin: 20px 0;
                cursor: pointer;

                &:first-of-type {
                    margin-top: 0;
                }

                &.selected .ivu-card {
                    box-shadow: var(--shadow-md);
                    border-color: var(--border-color);
                    background-color: var(--bg-hover);
                }
            }

            @media screen and (max-width: 1920px) {
                &.min-list-wrapper {
                    flex: 0 0 500px;
                }
            }

            @media screen and (max-width: 1440px) {
                &.min-list-wrapper {
                    flex: 0 0 300px;
                }
            }
        }

        .detail-wrapper {
            overflow-y: auto;
            flex: 1;
            margin: 10px 20px;
            box-sizing: border-box;
            transition: all 0.3s ease;
            padding-bottom: 40px;

            .back-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                margin-bottom: 12px;
                border: 1px solid var(--border-color);
                border-radius: 20px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.15s ease, box-shadow 0.15s ease;

                &:hover {
                    background: var(--bg-hover);
                    box-shadow: var(--shadow-sm);
                }
            }
        }
    }

    .auth-validate {
        position: fixed;
        top: 50%;
        left: 50%;
        width: 400px;
        height: 400px;
        margin-left: -200px;
        margin-top: -200px;
        background-color: var(--bg-elevated);
        z-index: 9999;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: var(--shadow-lg);

        p {
            line-height: 40px;
            text-align: center;
            font-weight: bold;
            color: #EA4335;
        }

        .auth-iframe {
            width: 400px;
            height: 350px;
        }
    }

    /* Mobile responsive */
    @media screen and (max-width: 768px) {
        .header {
            padding: 8px 12px;

            .header-logo {
                font-size: 20px;
            }
        }

        .container {
            padding: 64px 12px 20px;
            flex-direction: column;

            .list-wrapper {
                flex: none;
                width: 100%;

                &.min-list-wrapper {
                    flex: none;
                    width: 100%;
                }

                .list-item {
                    margin: 12px 0;
                }
            }

            .detail-wrapper {
                margin: 0;
                width: 100%;
            }
        }

        .auth-validate {
            width: 90%;
            margin-left: -45%;

            .auth-iframe {
                width: 100%;
            }
        }
    }

    /* Tablet responsive */
    @media screen and (min-width: 769px) and (max-width: 1024px) {
        .container {
            padding: 74px 24px 40px;

            .list-wrapper {
                flex: 0 0 400px;

                &.min-list-wrapper {
                    flex: 0 0 280px;
                }
            }
        }
    }

    /* Dark mode - iView component overrides */
    html[data-theme="dark"] & {
        .header-logo {
            background: linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 70%, #c084fc 100%);
            -webkit-background-clip: text;
            background-clip: text;
        }

        .ivu-card {
            background-color: var(--bg-card);
            border-color: var(--border-color);
            color: var(--text-primary);
            transition: background-color 0.3s ease, border-color 0.3s ease;

            .ivu-card-head {
                border-color: var(--border-color);
                color: var(--text-primary);

                p {
                    color: var(--text-primary);
                }
            }

            .ivu-card-body {
                color: var(--text-primary);
            }
        }

        .ivu-tag,
        .ivu-tag-default {
            background-color: rgba(220, 220, 230, 0.15) !important;
            border-color: rgba(220, 220, 230, 0.3) !important;
            color: #f3f4f6 !important;

            .ivu-tag-text {
                color: #f3f4f6 !important;
            }
        }

        .ivu-tag-blue {
            background-color: rgba(96, 165, 250, 0.2) !important;
            border-color: rgba(96, 165, 250, 0.4) !important;
            color: #93c5fd !important;

            .ivu-tag-text {
                color: #93c5fd !important;
            }
        }

        .ivu-page-item {
            background-color: var(--bg-card);
            border-color: var(--border-color);

            a {
                color: var(--text-primary);
            }

            &:hover {
                border-color: var(--btn-primary-bg);
            }

            &.ivu-page-item-active {
                background-color: var(--btn-primary-bg);
                border-color: var(--btn-primary-bg);

                a {
                    color: var(--btn-primary-text);
                }
            }
        }

        .ivu-page-prev,
        .ivu-page-next {
            background-color: var(--bg-card);
            border-color: var(--border-color);

            a {
                color: var(--text-primary);
            }
        }

        .ivu-page-options-elevator input {
            background-color: var(--bg-card);
            border-color: var(--border-color);
            color: var(--text-primary);
        }

        .ivu-spin-fix {
            background-color: rgba(24, 24, 24, 0.8);
        }

        .ivu-exception-desc {
            color: var(--text-secondary);
        }
    }
}

/* System dark mode fallback for iView overrides */
@media (prefers-color-scheme: dark) {
    html:not([data-theme]) .search-view {
        .header-logo {
            background: linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 70%, #c084fc 100%);
            -webkit-background-clip: text;
            background-clip: text;
        }

        .ivu-card {
            background-color: var(--bg-card);
            border-color: var(--border-color);
            color: var(--text-primary);

            .ivu-card-head {
                border-color: var(--border-color);
                color: var(--text-primary);

                p {
                    color: var(--text-primary);
                }
            }

            .ivu-card-body {
                color: var(--text-primary);
            }
        }

        .ivu-tag,
        .ivu-tag-default {
            background-color: rgba(220, 220, 230, 0.15) !important;
            border-color: rgba(220, 220, 230, 0.3) !important;
            color: #f3f4f6 !important;

            .ivu-tag-text {
                color: #f3f4f6 !important;
            }
        }

        .ivu-tag-blue {
            background-color: rgba(96, 165, 250, 0.2) !important;
            border-color: rgba(96, 165, 250, 0.4) !important;
            color: #93c5fd !important;

            .ivu-tag-text {
                color: #93c5fd !important;
            }
        }

        .ivu-page-item {
            background-color: var(--bg-card);
            border-color: var(--border-color);

            a {
                color: var(--text-primary);
            }

            &.ivu-page-item-active {
                background-color: var(--btn-primary-bg);
                border-color: var(--btn-primary-bg);

                a {
                    color: var(--btn-primary-text);
                }
            }
        }

        .ivu-page-prev,
        .ivu-page-next {
            background-color: var(--bg-card);
            border-color: var(--border-color);

            a {
                color: var(--text-primary);
            }
        }

        .ivu-spin-fix {
            background-color: rgba(24, 24, 24, 0.8);
        }

        .ivu-exception-desc {
            color: var(--text-secondary);
        }
    }
}
</style>
