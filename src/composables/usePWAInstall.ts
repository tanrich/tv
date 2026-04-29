import { ref, onMounted, onUnmounted } from 'vue';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true
    );
}

function detectIOS(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function usePWAInstall() {
    const showBanner = ref(false);
    const isIOS = ref(false);
    let deferredPrompt: BeforeInstallPromptEvent | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    const onBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
        scheduleShow();
    };

    function scheduleShow() {
        if (isStandalone() || isDismissed()) return;
        delayTimer = setTimeout(() => {
            showBanner.value = true;
        }, 3000);
    }

    async function install() {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            showBanner.value = false;
        }
        deferredPrompt = null;
    }

    function dismiss() {
        showBanner.value = false;
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }

    onMounted(() => {
        if (isStandalone() || isDismissed()) return;

        isIOS.value = detectIOS();

        if (isIOS.value) {
            // iOS 没有 beforeinstallprompt，直接延迟显示引导
            scheduleShow();
        } else {
            window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        }
    });

    onUnmounted(() => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        if (delayTimer) clearTimeout(delayTimer);
    });

    return { showBanner, isIOS, install, dismiss };
}
