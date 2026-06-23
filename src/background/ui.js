export const tabUrlsCache = new Map(); // Кеш для хранения URL самой вкладки (ключ: tabId, значение: URL-строка)

const actionAPI = browser.action || browser.browserAction;

// Кеш уникальных хостов для бейджей.
// Map<tabId, Map<hostname, { count, lastSeen }>> — считаем запросы на хост.
// При перезапуске Service Worker (в MV3) он очистится, но для бейджей это не критично.
const tabHostsCache = new Map();

export async function addHostToTab(tabId, hostname) {
    if (tabId === -1) return;

    if (!tabHostsCache.has(tabId)) {
        tabHostsCache.set(tabId, new Map());
    }

    const hostsMap = tabHostsCache.get(tabId);
    const entry = hostsMap.get(hostname);
    if (entry) {
        entry.count++;
        entry.lastSeen = Date.now();
    } else {
        hostsMap.set(hostname, { count: 1, lastSeen: Date.now() });
    }

    // Оборачиваем работу с вкладкой в try/catch, чтобы защитить от "Invalid tab ID"
    try {
        await actionAPI.setBadgeText({
            tabId: tabId,
            text: hostsMap.size.toString()
        });
        await actionAPI.setBadgeBackgroundColor({ tabId: tabId, color: "#4f46e5" });
    } catch (err) {
        // Игнорируем ошибку, так как вкладка, скорее всего, закрылась или обновилась в процессе
        console.warn(`[UI Cache] Не удалось обновить бейдж для вкладки ${tabId}: ${err.message}`);
    }
}

/**
 * Возвращает статистику проксированных хостов для указанной вкладки.
 * @param {number} tabId
 * @returns {Array<{hostname: string, count: number, lastSeen: number}> | null}
 */
export function getTabStats(tabId) {
    const hostsMap = tabHostsCache.get(tabId);
    if (!hostsMap || hostsMap.size === 0) return null;
    return Array.from(hostsMap.entries()).map(([hostname, data]) => ({
        hostname,
        count: data.count,
        lastSeen: data.lastSeen
    }));
}

export async function resetTabHosts(tabId) {
    tabHostsCache.delete(tabId);
    tabUrlsCache.delete(tabId);
    
    // Оборачиваем сброс UI в try/catch по той же причине
    try {
        await actionAPI.setBadgeText({ tabId: tabId, text: "" });
        await actionAPI.setIcon({ 
            tabId: tabId, 
            path: { "32": "/icons/icon-gray.png" } 
        });
    } catch (err) {
        // Тихо игнорируем ошибку, если вкладка больше не существует
    }
}

// Проверь, есть ли у тебя функция setTabIconProxied ниже в этом же файле.
// Её тоже стоит обезопасить, если она работает с actionAPI:
export async function setTabIconProxied(tabId) {
    if (tabId === -1) return;
    try {
        await actionAPI.setIcon({ 
            tabId: tabId, 
            path: { "32": "/icons/icon-green.png" } // или твоя цветная иконка
        });
    } catch (err) {
        // Игнорируем
    }
}

export function registerTabUrl(tabId, url) {
    if (tabId && tabId !== -1 && url) {
        tabUrlsCache.set(tabId, url);
    }
}

/**
 * Восстанавливает tabUrlsCache после перезапуска Service Worker (MV3).
 * Опрашивает все открытые вкладки и заполняет кеш их URL.
 * Без этого tab-режим молча упадёт в global/direct до следующей навигации.
 */
export async function restoreTabUrlsCache() {
    try {
        const tabs = await browser.tabs.query({});
        for (const tab of tabs) {
            if (tab.id && tab.id !== -1 && tab.url) {
                tabUrlsCache.set(tab.id, tab.url);
            }
        }
        console.debug(`[UI] Восстановлен кеш URL для ${tabs.length} вкладок`);
    } catch (err) {
        console.warn(`[UI] Не удалось восстановить кеш URL вкладок: ${err.message}`);
    }
}