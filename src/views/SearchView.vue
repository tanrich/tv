<script setup lang="ts">
import { computed, onBeforeMount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Tag, Card, Spin, Page, Exception } from 'view-ui-plus';
import SearchComponent from '../components/SearchComponent.vue';
import { createEmptyDetailData } from '@/common/util';
import { getDetail, getList, type IDetailData, type IResponseData, type IVodItem } from '@/api';
import DetailView from '@/components/DetailView.vue';

const router = useRouter();
const route = useRoute();
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
const isShowDetailPage = computed(() => !!data.detailData.vod_id);

onBeforeMount(() => {
    watch(
        () => route.query.keyword,
        (keyword) => {
            wd.value = keyword?.toString() ?? '';
            updateList();
        },
        { immediate: true },
    );
});

onMounted(() => {});

async function showLoading<T>(cb: () => Promise<T>) {
    isLoading.value = true;
    const res = await cb();
    isLoading.value = false;
    return res;
}

const updateList = async (page?: number) => {
    showLoading(async () => {
        const result = await getList(wd.value, page);
        data.pageData = result;
    });
};
const updateQuery = (keyword: string) => {
    router.replace({ query: { keyword } });
};
const updateDetail = async (vodId: string) => {
    showLoading(async () => {
        const result = await getDetail(vodId);
        const regex = /https:\/\/.*?\.m3u8/g;
        data.detailData = result.list[0];
        data.detailData.vod_play_url_parse = data.detailData.vod_play_url.match(regex) ?? [];
    });
};
</script>

<template>
    <div class="search-view">
        <div class="header">
            <img
                class="search-logo"
                src="//www.baidu.com/img/flexible/logo/pc/result@2.png"
                width="101"
                height="33"
                cursor="default"
            />
            <SearchComponent :text="wd" @submit="updateQuery"></SearchComponent>
        </div>
        <div class="container" v-show="data.pageData.total">
            <div :class="{ 'list-wrapper': true, 'min-list-wrapper': isShowDetailPage }">
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
                    @on-change="(page) => updateList(page)"
                />
            </div>
            <div class="detail-wrapper" v-if="isShowDetailPage">
                <Card>
                    <DetailView :data="data.detailData" />
                </Card>
            </div>
        </div>
        <Exception
            v-show="!data.pageData.total && !isLoading"
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
    </div>
</template>

<style lang="less">
.search-view {
    overflow: hidden;

    .search-view {
        position: relative;
    }

    .header {
        position: fixed;
        padding: 15px 0;
        width: 100%;
        box-sizing: border-box;
        z-index: 999;
        background-color: #fff;

        .search-logo {
            display: none;
            position: relative;
            left: -20px;
            float: left;
        }

        .search-input-wrapper {
            margin: 0 auto;
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
        padding: 74px 150px;
        display: flex;
        justify-content: center;
        overflow: hidden;

        .list-wrapper {
            flex: 0 0 656px;
            margin: 10px 0;
            box-sizing: border-box;
            transition: all 0.3s ease;

            .list-item {
                margin: 30px 0;
                cursor: pointer;

                &:first-of-type {
                    margin-top: 0;
                }

                &.selected .ivu-card {
                    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
                    border-color: #eee;
                    background-color: #fdfdfd;
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
            overflow: auto;
            flex: 1;
            margin: 10px 20px;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }
    }
}
</style>
