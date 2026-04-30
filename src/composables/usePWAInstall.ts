import { ref, onMounted, onUnmounted } from 'vue';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_FOREVER_KEY = 'pwa-install-never';
const DISMISS_DAYS = 7;
const AUTO_CLOSE_MS = 5000;

function isDismissed(): boolean {
    if (localStorage.getItem(DISMISS_FOREVER_KEY) === '1') return true;
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

type InAppBrowser = 'wechat' | 'qq' | false;

function detectInApp(): InAppBrowser {
    const ua = navigator.userAgent.toLowerCase();
    if (/micromessenger/i.test(ua)) return 'wechat';
    if (/\bqq\b/i.test(ua) && !/qqbrowser/i.test(ua)) return 'qq';
    return false;
}

export function usePWAInstall() {
    const showBanner = ref(false);
    const isIOS = ref(false);
    const inApp = ref<InAppBrowser>(false);
    let deferredPrompt: BeforeInstallPromptEvent | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

    const onBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
        scheduleShow();
    };

    function scheduleShow() {
        if (isStandalone() || isDismissed()) return;
        delayTimer = setTimeout(() => {
            showBanner.value = true;
            // 5秒后自动关闭
            autoCloseTimer = setTimeout(() => {
                if (showBanner.value) dismiss();
            }, AUTO_CLOSE_MS);
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
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }

    function dismissForever() {
        showBanner.value = false;
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        localStorage.setItem(DISMISS_FOREVER_KEY, '1');
    }

    function cancelAutoClose() {
        if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = null;
        }
    }

    onMounted(() => {
        if (isStandalone() || isDismissed()) return;

        isIOS.value = detectIOS();
        inApp.value = detectInApp();

        if (inApp.value) {
            // 微信/QQ 内置浏览器，引导用户用系统浏览器打开
            scheduleShow();
        } else if (isIOS.value) {
            // iOS 没有 beforeinstallprompt，直接延迟显示引导
            scheduleShow();
        } else {
            window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        }
    });

    onUnmounted(() => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        if (delayTimer) clearTimeout(delayTimer);
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
    });

    return { showBanner, isIOS, inApp, install, dismiss, dismissForever, cancelAutoClose };
}
