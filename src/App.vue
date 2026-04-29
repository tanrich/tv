<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
    <div class="main">
        <RouterView />
    </div>
</template>

<style scoped lang="less">
.main {
    width: 100%;
    min-height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
}
</style>
