import { state } from './state.js';
import { matchRule, buildProxyResponse } from './utils.js';
import { addHostToTab, setTabIconProxied, tabUrlsCache } from './ui.js';

// Хелпер, который проверяет, подходит ли конкретный URL под наши правила проксирования
function isUrlMatchRules(urlObj) {
    for (let rule of state.rules) {
        const domainData = state.domains[rule.domainListId];
        const masks = domainData ? (Array.isArray(domainData.list) ? domainData.list : []) : [];
        const proxyConfig = state.proxies[rule.proxyId];

        if (proxyConfig && masks.some(mask => matchRule(urlObj, mask))) {
            return proxyConfig; // Возвращаем конфиг прокси, если совпало
        }
    }
    return null;
}

export function handleProxyRequest(details) {
    // 1. Если расширение выключено глобально — пускаем всё напрямую
    if (!state.isEnabled) {
        return { type: "direct" };
    }

    const url = new URL(details.url);
    
    // 2. Проверка теста прокси
    if (state.testProxyConfig && url.hostname === 'example.com') {
        return buildProxyResponse(state.testProxyConfig);
    }

    // 3. Проверка черного списка (Исключений)
    if (Array.isArray(state.exceptions) && state.exceptions.some(mask => matchRule(url, mask))) {
        return { type: "direct" };
    }

    // --- НОВАЯ ЛОГИКА: ФИЛЬТРАЦИЯ ПО РЕЖИМУ РАБОТЫ ---
    
    if (state.routingMode === 'tab' && details.tabId !== -1) {
        // Получаем URL страницы, на которой находится пользователь во вкладке
        const currentTabUrlStr = tabUrlsCache.get(details.tabId);
        
        if (currentTabUrlStr) {
            const currentTabUrl = new URL(currentTabUrlStr);
            
            // Проверяем: входит ли САМА ВКЛАДКА в списки проксирования?
            const tabProxyConfig = isUrlMatchRules(currentTabUrl);
            
            if (!tabProxyConfig) {
                // Если сама страница в браузере не из белого списка, 
                // то любые подзапросы внутри нее (даже на proxy.com) идут НАПРЯМУЮ
                return { type: "direct" };
            }
            
            // Если вкладка должна проксироваться, проверяем текущий подзапрос:
            // Вариант А: Подзапрос тоже в белом списке (возможно, под другой прокси)
            const subrequestProxyConfig = isUrlMatchRules(url);
            if (subrequestProxyConfig) {
                if (details.tabId !== -1) { addHostToTab(details.tabId, url.hostname); setTabIconProxied(details.tabId); }
                return buildProxyResponse(subrequestProxyConfig);
            }
            
            // Вариант Б: Подзапрос обычный, но мы находимся на прокси-вкладке. 
            // Заворачиваем подзапрос в прокси этой вкладки, чтобы страница не ломалась из-за смешанного трафика.
            if (details.tabId !== -1) { addHostToTab(details.tabId, url.hostname); setTabIconProxied(details.tabId); }
            return buildProxyResponse(tabProxyConfig);
        }
    }

    // --- РЕЖИМ ГЛОБАЛЬНЫЙ (Старое поведение) ---
    const globalProxyConfig = isUrlMatchRules(url);
    if (globalProxyConfig) {
        if (details.tabId !== -1) {
            addHostToTab(details.tabId, url.hostname);
            setTabIconProxied(details.tabId);
        }
        return buildProxyResponse(globalProxyConfig);
    }

    return { type: "direct" };
}