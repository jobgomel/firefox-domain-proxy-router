// Глобальный кеш состояния
export const state = {
    isEnabled: true,
    routingMode: 'global', // <-- Новый режим: 'global' или 'tab'
    domains: {},
    proxies: {},
    rules: [],
    exceptions: [],
    testProxyConfig: null 
};

// Инициализация при старте расширения
export async function initStorageCache() {
    const res = await browser.storage.local.get(['isEnabled', 'routingMode', 'domains', 'proxies', 'rules', 'exceptions']);
    
    state.isEnabled = res.isEnabled !== false; 
    state.routingMode = res.routingMode || 'global'; // <-- Загружаем режим
    state.domains = res.domains || {};
    state.proxies = res.proxies || {};
    state.rules = res.rules || [];
    state.exceptions = res.exceptions || [];

    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        
        if (changes.isEnabled) state.isEnabled = changes.isEnabled.newValue !== false;
        if (changes.routingMode) state.routingMode = changes.routingMode.newValue || 'global'; // <-- Обновляем на лету
        if (changes.domains) state.domains = changes.domains.newValue || {};
        if (changes.proxies) state.proxies = changes.proxies.newValue || {};
        if (changes.rules) state.rules = changes.rules.newValue || [];
        if (changes.exceptions) state.exceptions = changes.exceptions.newValue || [];
    });
}

export function setTestProxyConfig(config) {
    state.testProxyConfig = config;
}