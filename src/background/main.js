import { initStorageCache, state, setTestProxyConfig } from './state.js';
import { handleProxyRequest } from './proxyRoute.js';
import { addHostToTab, setTabIconProxied, tabUrlsCache, resetTabHosts, registerTabUrl, restoreTabUrlsCache, getTabStats } from './ui.js';
import { registerProxyAuthHandler } from './auth.js';

// 1. Инициализируем локальный кеш при запуске скрипта
initStorageCache();

// 1.1 Восстанавливаем кеш URL вкладок после (возможного) перезапуска Service Worker
// Без этого tab-режим сломается до следующей навигации пользователем
restoreTabUrlsCache();

// 2. Основной слушатель прокси
browser.proxy.onRequest.addListener(
    (details) => handleProxyRequest(details, {
        getTabUrl: (tabId) => tabUrlsCache.get(tabId),
        onProxyMatch: (tabId, hostname) => {
            addHostToTab(tabId, hostname);
            setTabIconProxied(tabId);
        }
    }, state),
    { urls: ["<all_urls>"] }
);

// 3. Обработка авторизации прокси
registerProxyAuthHandler();

// 4. Очистка UI при навигации или закрытии вкладок
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // <-- Добавили tab сюда
    if (changeInfo.status === 'loading') {
        resetTabHosts(tabId);
        // Теперь tab определен, и эта проверка сработает отлично
        if (tab && tab.url) {
            registerTabUrl(tabId, tab.url);
        }
    }
});

browser.tabs.onRemoved.addListener((tabId) => {
    resetTabHosts(tabId);
});

// 5. Обработка клика по иконке и сообщений тестирования
// TODO: Добавлен попап при клике на иконку, в разработке
//browser.action.onClicked.addListener(() => {
//    browser.runtime.openOptionsPage();
//});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'testProxy') {
        setTestProxyConfig(message.proxy);
        const startTime = performance.now();

        fetch('https://example.com/', { method: 'HEAD', cache: 'no-store' })
            .then(() => {
                const endTime = performance.now();
                setTestProxyConfig(null);
                sendResponse({ success: true, duration: Math.round(endTime - startTime) });
            })
            .catch(err => {
                setTestProxyConfig(null);
                sendResponse({ success: false, error: err.message });
            });

        return true; // Держит порт открытым для асинхронного ответа
    } else if (message.action === 'getTabStats') {
        sendResponse({ stats: getTabStats(message.tabId) ?? [] });
    } else {
        sendResponse({ error: 'unknown action' });
    }
});