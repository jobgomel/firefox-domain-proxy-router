import { state } from './state.js';
import { matchRule } from './utils.js';
import { addHostToTab, setTabIconProxied } from './ui.js';

export function handleProxyRequest(details) {
    const url = new URL(details.url);
    
    // 1. Проверка: идет ли сейчас тест прокси
    if (state.testProxyConfig && url.hostname === 'example.com') {
        return {
            type: state.testProxyConfig.type,
            host: state.testProxyConfig.host,
            port: parseInt(state.testProxyConfig.port),
            username: state.testProxyConfig.username || undefined,
            password: state.testProxyConfig.password || undefined
        };
    }

    // 2. НОВАЯ ПРОВЕРКА: Исключения (Черный список)
    // Если маска совпадает, пускаем трафик НАПРЯМУЮ, минуя прокси-правила
    if (Array.isArray(state.exceptions) && state.exceptions.some(mask => matchRule(url, mask))) {
        return { type: "direct" };
    }

    // 3. Поиск совпадений по правилам маршрутизации
    for (let rule of state.rules) {
        const domainData = state.domains[rule.domainListId];
        const masks = domainData ? (Array.isArray(domainData.list) ? domainData.list : []) : [];
        const proxyConfig = state.proxies[rule.proxyId];

        if (proxyConfig && masks.some(mask => matchRule(url, mask))) {
            
            // Если запрос принадлежит вкладке — обновляем UI параллельно
            if (details.tabId !== -1) {
                addHostToTab(details.tabId, url.hostname);
                setTabIconProxied(details.tabId);
            }

            return {
                type: proxyConfig.type,
                host: proxyConfig.host,
                port: parseInt(proxyConfig.port),
                username: proxyConfig.username || undefined,
                password: proxyConfig.password || undefined
            };
        }
    }

    // 4. Прямое соединение, если нет совпадений
    return { type: "direct" };
}