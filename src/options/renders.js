import { createCardRow, createCardInfo, createCardTitle, createCardSub, createControlsWrapper, createStatusSpan, createButton, createBadge, createPlaceholder } from './helpers.js';
import { setPlaceholder, setSelectPlaceholder } from './utils.js';
import { startEditProxy, deleteItem, testProxyById, startEditDomain, deleteRule } from './forms.js';

export function renderAll(state, section = 'all') {
    if (section === 'all' || section === 'proxy') renderProxies(state);
    if (section === 'all' || section === 'domain') renderDomains(state);
    if (section === 'all' || section === 'rule') renderRules(state);
    updateRuleSelects(state);
}

function renderProxies(state) {
    const list = document.getElementById('proxy-list');
    list.replaceChildren();

    if (Object.keys(state.proxies).length === 0) {
        setPlaceholder(list, 'Список прокси пуст');
        return;
    }

    for (const [id, p] of Object.entries(state.proxies)) {
        if (!p) continue;

        const title = createCardTitle(p.name || 'Proxy');
        const badge = createBadge(p.username ? 'с авторизацией' : 'открытый', !!p.username);
        title.appendChild(badge);

        const sub = createCardSub(`${p.type.toUpperCase()} -> ${p.host}:${p.port}`);
        const info = createCardInfo(title, sub);

        const controls = createControlsWrapper();
        controls.appendChild(createStatusSpan(id));
        controls.appendChild(createButton('Тест', 'btn-test', () => testProxyById(id)));
        controls.appendChild(createButton('Ред.', 'btn-edit', () => startEditProxy(id)));
        controls.appendChild(createButton('Удалить', 'btn-del', () => deleteItem('proxies', id)));

        const row = createCardRow();
        row.appendChild(info);
        row.appendChild(controls);
        list.appendChild(row);
    }
}

function renderDomains(state) {
    const list = document.getElementById('domain-list');
    list.replaceChildren();

    if (Object.keys(state.domains).length === 0) {
        setPlaceholder(list, 'Списки масок не созданы');
        return;
    }

    for (const [id, d] of Object.entries(state.domains)) {
        if (!d) continue;
        const listArray = Array.isArray(d.list) ? d.list : (Array.isArray(d) ? d : []);

        const title = createCardTitle(d.name || 'Список масок');
        const sub = createCardSub(listArray.join(', '));
        const info = createCardInfo(title, sub);

        const controls = createControlsWrapper();
        controls.appendChild(createButton('Ред.', 'btn-edit', () => startEditDomain(id)));
        controls.appendChild(createButton('Удалить', 'btn-del', () => deleteItem('domains', id)));

        const row = createCardRow();
        row.appendChild(info);
        row.appendChild(controls);
        list.appendChild(row);
    }
}

function renderRules(state) {
    const list = document.getElementById('rule-list');
    list.replaceChildren();

    if (state.rules.length === 0) {
        list.appendChild(createPlaceholder('Нет активных правил трафика'));
        return;
    }

    state.rules.forEach((r, index) => {
        if (!r) return;
        const dName = state.domains[r.domainListId]?.name || "Удаленный список";
        const pName = state.proxies[r.proxyId]?.name || "Удаленный прокси";

        const title = document.createElement('span');
        title.className = 'card-title';
        title.appendChild(document.createTextNode('Если подходит под маски '));
        const domainSpan = document.createElement('span');
        domainSpan.style.color = 'var(--accent)';
        domainSpan.textContent = `[${dName}]`;
        title.appendChild(domainSpan);

        const sub = document.createElement('span');
        sub.className = 'card-sub';
        sub.appendChild(document.createTextNode('Направлять через прокси: '));
        const proxyBold = document.createElement('b');
        proxyBold.textContent = pName;
        sub.appendChild(proxyBold);

        const info = createCardInfo(title, sub);
        const controls = createControlsWrapper();
        controls.appendChild(createButton('Отключить', 'btn-del', () => deleteRule(index)));

        const row = createCardRow();
        row.appendChild(info);
        row.appendChild(controls);
        list.appendChild(row);
    });
}

function updateRuleSelects(state) {
    const rDomain = document.getElementById('r-domain');
    const rProxy = document.getElementById('r-proxy');
    if (!rDomain || !rProxy) return;

    rDomain.innerHTML = '';
    rProxy.innerHTML = '';

    const activeDomainIds = state.rules.map(rule => rule.domainListId);

    const availableDomains = Object.entries(state.domains).filter(([id, d]) => {
        return d && !activeDomainIds.includes(id);
    });

    if (availableDomains.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = Object.keys(state.domains).length === 0
            ? '-- Сначала добавьте список масок --'
            : '-- Все списки масок уже активированы --';
        rDomain.appendChild(opt);
    } else {
        for (const [id, d] of availableDomains) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `Список: ${d.name}`;
            rDomain.appendChild(opt);
        }
    }

    if (Object.keys(state.proxies).length === 0) {
        setSelectPlaceholder(rProxy, '-- Сначала добавьте прокси --');
    } else {
        for (const [id, p] of Object.entries(state.proxies)) {
            if (!p) continue;
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `Прокси: ${p.name} (${p.type.toUpperCase()})`;
            rProxy.appendChild(opt);
        }
    }
}
