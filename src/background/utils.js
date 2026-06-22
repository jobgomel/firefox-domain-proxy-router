// Кеш для скомпилированных регулярных выражений
const regexCache = new Map();

function wildcardToRegex(str) {
    if (regexCache.has(str)) return regexCache.get(str);
    
    const escaped = str.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
    
    regexCache.set(str, regex);
    return regex;
}

export function matchRule(urlObj, mask) {
    mask = mask.trim();
    if (!mask) return false;

    if (mask.includes('/')) {
        const cleanMask = mask.replace(/^https?:\/\//, '');
        const target = urlObj.host + urlObj.pathname;
        return wildcardToRegex(cleanMask).test(target);
    } else {
        return wildcardToRegex(mask).test(urlObj.hostname);
    }
}

export function buildProxyResponse(proxyConfig) {
    return {
        type: proxyConfig.type,
        host: proxyConfig.host,
        port: parseInt(proxyConfig.port),
        username: proxyConfig.username || undefined,
        password: proxyConfig.password || undefined
    };
}
