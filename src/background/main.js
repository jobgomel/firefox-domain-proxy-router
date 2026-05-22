import { initStorageCache, state, setTestProxyConfig } from './state.js';
import { handleProxyRequest } from './proxyRoute.js';
//import { resetTabHosts, registerTabUrl } from './ui.js';
import { resetTabHosts } from './ui.js';

// 1. Инициализируем локальный кеш при запуске скрипта
initStorageCache();

// 2. Основной слушатель прокси (теперь он быстрый и синхронный)
browser.proxy.onRequest.addListener(
    handleProxyRequest,
    { urls: ["<all_urls>"] }
);

// 3. Обработка авторизации прокси
browser.webRequest.onAuthRequired.addListener(
    function(details) {
        if (!details.isProxy) return {};
        const proxyHost = details.challenger.host;
        const proxyPort = details.challenger.port;
        
        // Авторизация для тестового прокси
        if (state.testProxyConfig && state.testProxyConfig.host === proxyHost && parseInt(state.testProxyConfig.port) === proxyPort) {
            return { authCredentials: { username: state.testProxyConfig.username, password: state.testProxyConfig.password } };
        }

        // Авторизация для рабочих прокси (ищем по хосту и порту)
        for (let key in state.proxies) {
            const authProxy = state.proxies[key];
            if (authProxy.host === proxyHost && parseInt(authProxy.port) === proxyPort) {
                if (authProxy.username && authProxy.password) {
                    return { authCredentials: { username: authProxy.username, password: authProxy.password } };
                }
            }
        }
        return { cancel: true };
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);

// 4. Очистка UI при навигации или закрытии вкладок
browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        resetTabHosts(tabId);
        // Если у нас есть URL вкладки (переход на новый сайт), сохраняем его в кеш
        //if (tab && tab.url) {
        //    registerTabUrl(tabId, tab.url);
        //}
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
        
        fetch('http://example.com/', { method: 'HEAD', cache: 'no-store' })
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
    }
});