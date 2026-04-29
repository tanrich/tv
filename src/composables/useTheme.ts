import { ref, computed, onMounted, onUnmounted } from 'vue';

type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'tv-theme';

const themeMode = ref<ThemeMode>('system');

function getSystemDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(mode: ThemeMode) {
    const html = document.documentElement;
    if (mode === 'system') {
        html.removeAttribute('data-theme');
    } else {
        html.setAttribute('data-theme', mode);
    }
}

export function useTheme() {
    const isDark = computed(() => {
        if (themeMode.value === 'system') {
            return getSystemDark();
        }
        return themeMode.value === 'dark';
    });

    function toggleTheme() {
        if (themeMode.value === 'system') {
            themeMode.value = getSystemDark() ? 'light' : 'dark';
        } else if (themeMode.value === 'dark') {
            themeMode.value = 'light';
        } else {
            themeMode.value = 'dark';
        }
        localStorage.setItem(STORAGE_KEY, themeMode.value);
        applyTheme(themeMode.value);
    }

    let mediaQuery: MediaQueryList | null = null;
    let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

    onMounted(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
            themeMode.value = stored;
        }
        applyTheme(themeMode.value);

        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaHandler = () => {
            if (themeMode.value === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', mediaHandler);
    });

    onUnmounted(() => {
        if (mediaQuery && mediaHandler) {
            mediaQuery.removeEventListener('change', mediaHandler);
        }
    });

    return {
        theme: themeMode,
        isDark,
        toggleTheme,
    };
}
