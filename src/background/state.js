// Глобальный кеш состояния
export const state = {
    domains: {},
    proxies: {},
    rules: [],
    testProxyConfig: null // Конфиг для тестирования из options
};

// Инициализация при старте расширения
export async function initStorageCache() {
    const res = await browser.storage.local.get(['domains', 'proxies', 'rules']);
    state.domains = res.domains || {};
    state.proxies = res.proxies || {};
    state.rules = res.rules || [];

    // Слушаем изменения из настроек и обновляем кеш на лету
    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        
        if (changes.domains) state.domains = changes.domains.newValue || {};
        if (changes.proxies) state.proxies = changes.proxies.newValue || {};
        if (changes.rules) state.rules = changes.rules.newValue || [];
    });
}

// Установка конфига для тестирования
export function setTestProxyConfig(config) {
    state.testProxyConfig = config;
}