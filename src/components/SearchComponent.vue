<script setup lang="ts">
import { ref, watch } from 'vue';

const searchText = ref('');
const props = defineProps<{ text?: string }>();
const emit = defineEmits<{
    (e: 'submit', text: string): void;
}>();
watch(
    () => props.text,
    (text = '') => (searchText.value = text),
    { immediate: true },
);

const submit = () => emit('submit', searchText.value);
</script>

<template>
    <div class="search-input-wrapper">
        <input class="search-input" type="text" v-model="searchText" @keydown.enter="submit" />
        <button class="search-button" @click="submit">搜索一下</button>
    </div>
</template>

<style scoped lang="less">
.search-input-wrapper {
    width: 656px;

    .search-input {
        width: 512px;
        height: 16px;
        padding: 12px 16px;
        font-size: 16px;
        margin: 0;
        vertical-align: top;
        outline: 0;
        box-shadow: none;
        border-radius: 10px 0 0 10px;
        border: 2px solid #c4c7ce;
        background: #fff;
        color: #222;
        overflow: hidden;
        box-sizing: content-box;
        -webkit-tap-highlight-color: transparent;
        border-color: #4569ff;
    }

    .search-button {
        cursor: pointer;
        width: 108px;
        height: 44px;
        line-height: 45px;
        line-height: 44px;
        padding: 0;
        background: 0 0;
        background-color: #4e6ef2;
        border-radius: 0 10px 10px 0;
        font-size: 17px;
        color: #fff;
        box-shadow: none;
        font-weight: bold;
        border: none;
        outline: 0;

        &:hover {
            background-color: #4662d9;
        }
    }
}
</style>
