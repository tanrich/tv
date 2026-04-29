<script setup lang="ts">
import { useRouter } from 'vue-router';
import SearchComponent from '../components/SearchComponent.vue';
import HistoryPanel from '../components/HistoryPanel.vue';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

const goToSearchDetail = (keyword: string) => {
    router.push({ name: 'search', query: { keyword } });
};
</script>

<template>
    <div class="home-view">
        <div class="top-actions">
            <button class="theme-toggle" @click="toggleTheme" :aria-label="isDark ? '切换到亮色模式' : '切换到暗黑模式'">
                <!-- Sun icon -->
                <svg v-if="isDark" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <!-- Moon icon -->
                <svg v-else viewBox="0 0 24 24" fill="none">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <HistoryPanel />
        </div>

        <div class="search-container">
            <h1 class="logo">TV</h1>
            <SearchComponent @submit="goToSearchDetail" />
        </div>

        <footer class="footer">
            <span>家庭专属影院@tanrich</span>
        </footer>
    </div>
</template>

<style scoped lang="less">
.home-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: var(--bg-primary);
    position: relative;
    transition: background-color 0.3s ease;
}

.top-actions {
    position: absolute;
    top: 20px;
    right: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.theme-toggle {
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
    transition: background-color 0.15s ease, color 0.15s ease;

    svg {
        width: 22px;
        height: 22px;
    }

    &:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
    }
}

.search-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 90%;
    max-width: 580px;
    margin-top: -80px;
}

.logo {
    font-size: 88px;
    font-weight: 800;
    letter-spacing: -4px;
    margin-bottom: 36px;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    user-select: none;
    line-height: 1.1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
}

.footer {
    position: absolute;
    bottom: 24px;
    color: var(--text-tertiary);
    font-size: 13px;
}

@media screen and (max-width: 768px) {
    .logo {
        font-size: 56px;
        margin-bottom: 24px;
    }

    .top-actions {
        top: 12px;
        right: 12px;
    }

    .search-container {
        margin-top: -40px;
    }
}

@media screen and (min-width: 769px) and (max-width: 1024px) {
    .logo {
        font-size: 72px;
    }
}

/* Dark mode logo */
html[data-theme="dark"] .logo {
    background: linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 70%, #c084fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 2px 8px rgba(139, 92, 246, 0.3));
}

@media (prefers-color-scheme: dark) {
    html:not([data-theme]) .logo {
        background: linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 70%, #c084fc 100%);
        -webkit-background-clip: text;
        background-clip: text;
        filter: drop-shadow(0 2px 8px rgba(139, 92, 246, 0.3));
    }
}
</style>
