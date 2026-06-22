import { state } from './state.js';

function handleProxyAuth(details) {
    if (!details.isProxy) return { cancel: true };
    const proxyHost = details.challenger.host;
    const proxyPort = details.challenger.port;

    // Авторизация для тестового прокси
    if (state.testProxyConfig
        && state.testProxyConfig.host === proxyHost
        && parseInt(state.testProxyConfig.port) === proxyPort) {
        return { authCredentials: { username: state.testProxyConfig.username, password: state.testProxyConfig.password } };
    }

    // Авторизация для рабочих прокси (ищем по хосту и порту)
    for (let key in state.proxies) {
        const authProxy = state.proxies[key];
        if (authProxy.host === proxyHost && parseInt(authProxy.port) === proxyPort) {
            if (authProxy.username && authProxy.password) {
                return { authCredentials: { username: authProxy.username, password: authProxy.password } };
            }
        }
    }
    return { cancel: true };
}

export function registerProxyAuthHandler() {
    browser.webRequest.onAuthRequired.addListener(
        handleProxyAuth,
        { urls: ['<all_urls>'] },
        ['blocking']
    );
}
