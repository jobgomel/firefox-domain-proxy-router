// Глобальный кеш состояния
export const state = {
    isEnabled: true, // <-- Глобальный флаг активности расширения
    domains: {},
    proxies: {},
    rules: [],
    exceptions: [],
    testProxyConfig: null 
};

// Инициализация при старте расширения
export async function initStorageCache() {
    const res = await browser.storage.local.get(['isEnabled', 'domains', 'proxies', 'rules', 'exceptions']);
    
    // По умолчанию true, если ключ отсутствует в хранилище
    state.isEnabled = res.isEnabled !== false; 
    
    state.domains = res.domains || {};
    state.proxies = res.proxies || {};
    state.rules = res.rules || [];
    state.exceptions = res.exceptions || [];

    // Слушаем изменения и обновляем кеш на лету
    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        
        if (changes.isEnabled) state.isEnabled = changes.isEnabled.newValue !== false;
        if (changes.domains) state.domains = changes.domains.newValue || {};
        if (changes.proxies) state.proxies = changes.proxies.newValue || {};
        if (changes.rules) state.rules = changes.rules.newValue || [];
        if (changes.exceptions) state.exceptions = changes.exceptions.newValue || [];
    });
}

export function setTestProxyConfig(config) {
    state.testProxyConfig = config;
}