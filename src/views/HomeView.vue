<script setup lang="ts">
import { useRouter } from 'vue-router';
import SearchComponent from '../components/SearchComponent.vue';

const router = useRouter();

const goToSearchDetail = (keyword: string) => {
    router.push({ name: 'search', query: { keyword } });
};
</script>

<template>
    <div class="home-view">
        <div class="search">
            <img
                class="search-logo"
                src="//www.baidu.com/img/PCfb_5bf082d29588c07f842ccde3f97243ea.png"
                width="270"
                height="129"
                cursor="default"
            />
            <SearchComponent @submit="goToSearchDetail"></SearchComponent>
        </div>
    </div>
</template>

<style scoped lang="less">
.home-view {
    background-image: url('https://dss1.bdstatic.com/lvoZeXSm1A5BphGlnYG/skin/12.jpg?2');
    background-size: cover;
    height: 100vh;

    .search {
        overflow: hidden;
        position: relative;
        height: 40%;
        min-height: 314px;
        max-height: 510px;
        width: 1000px;
        margin: 0 auto;
        top: 15%;

        .search-logo {
            display: block;
            margin: 33px auto 0 auto;
        }

        .search-input-wrapper {
            margin: 20px auto 0 auto;
        }
    }
}
</style>
