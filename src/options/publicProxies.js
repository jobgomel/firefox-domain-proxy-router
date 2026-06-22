import { createCardRow, createCardInfo, createCardTitle, createCardSub, createControlsWrapper, createStatusSpan, createButton } from './helpers.js';
import { setSelectPlaceholder } from './utils.js';
import { testProxy } from '../shared/testProxy.js';

export function setupPublicProxies(state, { genId }) {
    let publicProxiesData = [];

    const btnOpenPub = document.getElementById('btn-open-public-proxies');
    const modalPub = document.getElementById('public-proxies-modal');
    const btnClosePub = document.getElementById('btn-close-modal');
    const btnRefreshPub = document.getElementById('btn-refresh-pub');
    const filterProto = document.getElementById('pub-filter-protocol');
    const filterGeo = document.getElementById('pub-filter-geo');
    const pubListContainer = document.getElementById('pub-proxy-list');
    const pubLoading = document.getElementById('pub-loading');

    // ===== MODAL EVENTS =====

    btnOpenPub.addEventListener('click', () => {
        modalPub.style.display = 'block';
        if (publicProxiesData.length === 0) {
            fetchPublicProxies();
        }
    });

    btnClosePub.addEventListener('click', () => {
        modalPub.style.display = 'none';
    });

    modalPub.addEventListener('click', (e) => {
        if (e.target === modalPub) modalPub.style.display = 'none';
    });

    btnRefreshPub.addEventListener('click', fetchPublicProxies);
    filterProto.addEventListener('change', renderPublicProxies);
    filterGeo.addEventListener('change', renderPublicProxies);

    // ===== INTERNAL HELPERS =====

    function createErrorElement(message, retryFn) {
        const container = document.createElement('div');
        container.style.cssText = 'text-align:center; padding:1rem;';
        const msgEl = document.createElement('div');
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = `❌ ${message}`;
        container.appendChild(msgEl);
        if (retryFn) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn-test';
            retryBtn.textContent = '↻ Повторить';
            retryBtn.addEventListener('click', retryFn);
            container.appendChild(retryBtn);
        }
        return container;
    }

    async function fetchPublicProxies() {
        pubListContainer.replaceChildren();
        pubLoading.style.display = 'block';
        try {
            if (!navigator.onLine) {
                throw new Error('Нет подключения к интернету. Проверьте соединение.');
            }
            const res = await fetch('https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.json', { cache: 'no-store' });
            if (!res.ok) throw new Error(`Ошибка сервера (HTTP ${res.status})`);

            const data = await res.json();
            publicProxiesData = data;

            const protocols = new Set();
            const countries = new Set();

            data.forEach(p => {
                if (p.protocol) protocols.add(p.protocol);
                if (p.geolocation && p.geolocation.country) countries.add(p.geolocation.country);
            });

            populateSelect(filterProto, protocols, "Все протоколы");
            populateSelect(filterGeo, countries, "Все страны");

            renderPublicProxies();
        } catch (err) {
            pubListContainer.replaceChildren(createErrorElement(err.message, fetchPublicProxies));
        } finally {
            pubLoading.style.display = 'none';
        }
    }

    function populateSelect(selectEl, setValues, defaultText) {
        const currentVal = selectEl.value;
        setSelectPlaceholder(selectEl, defaultText);

        Array.from(setValues).sort().forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            selectEl.appendChild(opt);
        });

        if (setValues.has(currentVal)) selectEl.value = currentVal;
    }

    function buildProxyConfigFromPublic(p) {
        const extType = p.protocol.toLowerCase().includes('socks') ? 'socks' : 'http';
        const country = p.geolocation?.country || 'Unknown';
        return {
            name: `Pub ${country} ${p.protocol.toUpperCase()}`,
            type: extType,
            host: p.ip,
            port: p.port.toString(),
            username: null,
            password: null,
        };
    }

    function renderPublicProxies() {
        pubListContainer.replaceChildren();
        const protoFilter = filterProto.value;
        const geoFilter = filterGeo.value;

        const filtered = publicProxiesData.filter(p => {
            if (protoFilter && p.protocol !== protoFilter) return false;
            if (geoFilter && (!p.geolocation || p.geolocation.country !== geoFilter)) return false;
            return true;
        });

        const limited = filtered.slice(0, 50);

        if (limited.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'placeholder-text';
            emptyDiv.textContent = 'Ничего не найдено по заданным фильтрам';
            pubListContainer.replaceChildren(emptyDiv);
            return;
        }

        limited.forEach(p => {
            const country = p.geolocation?.country || 'Unknown';
            const city = p.geolocation?.city ? ` (${p.geolocation.city})` : '';
            const proxyConfig = buildProxyConfigFromPublic(p);

            const title = createCardTitle('');
            title.appendChild(document.createTextNode(`${p.ip}:${p.port} `));
            const badge = document.createElement('span');
            badge.className = 'badge badge-noauth';
            badge.style.background = 'var(--elevated)';
            badge.style.color = 'var(--body)';
            badge.textContent = p.protocol.toUpperCase();
            title.appendChild(badge);

            const sub = createCardSub(`📍 ${country}${city} | Анонимность: ${p.anonymity || '-'}`);
            const info = createCardInfo(title, sub);

            const controls = createControlsWrapper();
            const statusSpan = createStatusSpan();
            controls.appendChild(statusSpan);
            controls.appendChild(createButton('Тест', 'btn-test', () => testProxy(proxyConfig, statusSpan)));
            controls.appendChild(createButton('Добавить', 'btn-primary', () => {
                const newId = genId();
                state.addProxy(newId, proxyConfig);
                const btn = controls.querySelector('.btn-primary');
                if (btn) {
                    btn.textContent = '✓ Добавлено';
                    btn.style.backgroundColor = 'var(--success)';
                    btn.disabled = true;
                }
            }));

            const row = createCardRow();
            row.style.marginBottom = '0.5rem';
            row.appendChild(info);
            row.appendChild(controls);
            pubListContainer.appendChild(row);
        });
    }
}
