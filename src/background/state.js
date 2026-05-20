// Глобальный кеш состояния
export const state = {
    domains: {},
    proxies: {},
    rules: [],
    exceptions: [], // <-- Новый массив для масок-исключений
    testProxyConfig: null 
};

// Инициализация при старте расширения
export async function initStorageCache() {
    const res = await browser.storage.local.get(['domains', 'proxies', 'rules', 'exceptions']);
    state.domains = res.domains || {};
    state.proxies = res.proxies || {};
    state.rules = res.rules || [];
    state.exceptions = res.exceptions || []; // <-- Загружаем из хранилища

    // Слушаем изменения из настроек и обновляем кеш на лету
    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        
        if (changes.domains) state.domains = changes.domains.newValue || {};
        if (changes.proxies) state.proxies = changes.proxies.newValue || {};
        if (changes.rules) state.rules = changes.rules.newValue || [];
        if (changes.exceptions) state.exceptions = changes.exceptions.newValue || []; // <-- Обновляем на лету
    });
}

export function setTestProxyConfig(config) {
    state.testProxyConfig = config;
}