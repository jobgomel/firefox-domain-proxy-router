import { matchRule, buildProxyResponse } from './utils.js';
import { state as defaultState } from './state.js';

// Хелпер, который проверяет, подходит ли конкретный URL под наши правила проксирования
function isUrlMatchRules(urlObj, state) {
    for (let rule of state.rules) {
        const domainData = state.domains[rule.domainListId];
        const masks = domainData ? (Array.isArray(domainData.list) ? domainData.list : []) : [];
        const proxyConfig = state.proxies[rule.proxyId];

        if (proxyConfig && masks.some(mask => matchRule(urlObj, mask))) {
            return proxyConfig;
        }
    }
    return null;
}

export function handleProxyRequest(details, { getTabUrl, onProxyMatch } = {}, state = defaultState) {
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

    // --- ФИЛЬТРАЦИЯ ПО РЕЖИМУ РАБОТЫ ---

    if (state.routingMode === 'tab') {
        // Фоновые/системные запросы без контекста вкладки (tabId === -1) — всегда direct.
        // В tab-mode мы не можем определить, к какой вкладке относится запрос,
        // поэтому проксировать его по глобальным правилам было бы неочевидно.
        if (details.tabId === -1) {
            return { type: "direct" };
        }

        const currentTabUrlStr = getTabUrl ? getTabUrl(details.tabId) : null;

        if (currentTabUrlStr) {
            const currentTabUrl = new URL(currentTabUrlStr);

            const tabProxyConfig = isUrlMatchRules(currentTabUrl, state);

            if (!tabProxyConfig) {
                return { type: "direct" };
            }

            // Вариант А: Подзапрос тоже в белом списке (возможно, под другой прокси)
            const subrequestProxyConfig = isUrlMatchRules(url, state);
            if (subrequestProxyConfig) {
                if (details.tabId !== -1 && onProxyMatch) onProxyMatch(details.tabId, url.hostname);
                return buildProxyResponse(subrequestProxyConfig);
            }

            // Вариант Б: Подзапрос обычный, но мы находимся на прокси-вкладке.
            if (details.tabId !== -1 && onProxyMatch) onProxyMatch(details.tabId, url.hostname);
            return buildProxyResponse(tabProxyConfig);
        }
    }

    // --- РЕЖИМ ГЛОБАЛЬНЫЙ ---
    const globalProxyConfig = isUrlMatchRules(url, state);
    if (globalProxyConfig) {
        if (details.tabId !== -1 && onProxyMatch) onProxyMatch(details.tabId, url.hostname);
        return buildProxyResponse(globalProxyConfig);
    }

    return { type: "direct" };
}
