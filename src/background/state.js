// Глобальный кеш состояния
export const state = {
    isEnabled: true,
    routingMode: 'global', // режим: 'global' или 'tab'
    domains: {},
    proxies: {},
    rules: [],
    exceptions: [],
    testProxyConfig: null,
    _proxyLookup: null
};

/**
 * Предварительно вычисляет карту поиска прокси по URL.
 * - exactMap: точные hostname → proxyConfig (O(1) lookup)
 * - wildcardMasks: hostname-маски с * → [{pattern, proxyConfig}]
 * - pathMasks: маски с путями → [{pattern, proxyConfig}]
 *
 * Вызывается при загрузке/изменении правил, доменов или прокси.
 */
export function rebuildProxyLookup(st) {
    const exactMap = new Map();
    const wildcardMasks = [];
    const pathMasks = [];

    if (!st.rules || !st.domains || !st.proxies) {
        st._proxyLookup = { exactMap, wildcardMasks, pathMasks };
        return;
    }

    for (const rule of st.rules) {
        if (!rule) continue;

        const domainData = st.domains[rule.domainListId];
        const masks = domainData
            ? (Array.isArray(domainData.list) ? domainData.list : [])
            : [];
        const proxyConfig = st.proxies[rule.proxyId];

        if (!proxyConfig) continue;

        for (const rawMask of masks) {
            const mask = typeof rawMask === 'string' ? rawMask.trim() : '';
            if (!mask) continue;

            if (mask.includes('/')) {
                // Маска с путём: example.com/api/*
                const cleanMask = mask.replace(/^https?:\/\//, '');
                pathMasks.push({ pattern: cleanMask, proxyConfig });
            } else if (mask.includes('*')) {
                // Wildcard-маска хоста: *.example.com
                wildcardMasks.push({ pattern: mask, proxyConfig });
            } else {
                // Точный hostname — сохраняем первый подходящий (first-match-wins)
                if (!exactMap.has(mask)) {
                    exactMap.set(mask, proxyConfig);
                }
            }
        }
    }

    st._proxyLookup = { exactMap, wildcardMasks, pathMasks };
}

// Инициализация при старте расширения
export async function initStorageCache() {
    const res = await browser.storage.local.get(['isEnabled', 'routingMode', 'domains', 'proxies', 'rules', 'exceptions']);

    state.isEnabled = res.isEnabled !== false;
    state.routingMode = res.routingMode || 'global';
    state.domains = res.domains || {};
    state.proxies = res.proxies || {};
    state.rules = res.rules || [];
    state.exceptions = res.exceptions || [];

    // Строим lookup-кеш после загрузки данных
    rebuildProxyLookup(state);

    browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;

        let needsRebuild = false;

        if (changes.isEnabled) state.isEnabled = changes.isEnabled.newValue !== false;
        if (changes.routingMode) state.routingMode = changes.routingMode.newValue || 'global';
        if (changes.domains) { state.domains = changes.domains.newValue || {}; needsRebuild = true; }
        if (changes.proxies) { state.proxies = changes.proxies.newValue || {}; needsRebuild = true; }
        if (changes.rules) { state.rules = changes.rules.newValue || []; needsRebuild = true; }
        if (changes.exceptions) state.exceptions = changes.exceptions.newValue || [];

        // Перестраиваем lookup при изменении данных, влияющих на маршрутизацию
        if (needsRebuild) rebuildProxyLookup(state);
    });
}

export function setTestProxyConfig(config) {
    state.testProxyConfig = config;
}
