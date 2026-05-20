const actionAPI = browser.action || browser.browserAction;

// Кеш уникальных хостов для бейджей. 
// При перезапуске Service Worker (в MV3) он очистится, но для бейджей это не критично.
const tabHostsCache = new Map();

export function addHostToTab(tabId, hostname) {
    if (tabId === -1) return;

    if (!tabHostsCache.has(tabId)) {
        tabHostsCache.set(tabId, new Set());
    }
    
    const hostsSet = tabHostsCache.get(tabId);
    hostsSet.add(hostname);
    
    // Обновляем бейдж (не ждем выполнения, делаем асинхронно fire-and-forget)
    actionAPI.setBadgeText({ 
        tabId: tabId, 
        text: hostsSet.size.toString() 
    });
    actionAPI.setBadgeBackgroundColor({ tabId: tabId, color: "#4f46e5" });
}

export function resetTabHosts(tabId) {
    tabHostsCache.delete(tabId);
    actionAPI.setBadgeText({ tabId: tabId, text: "" });
    actionAPI.setIcon({ tabId: tabId, path: { "32": "/icons/icon-gray.png" } });
}

export function setTabIconProxied(tabId) {
    if (tabId !== -1) {
        actionAPI.setIcon({ tabId: tabId, path: { "32": "/icons/icon-green.png" } });
    }
}