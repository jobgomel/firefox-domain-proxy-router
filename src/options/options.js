let appState = { proxies: {}, domains: {}, rules: [] };
let editingProxyId = null;
let editingDomainId = null;
let currentTab = 'proxies'; // Активная вкладка по умолчанию

const genId = () => '_' + Math.random().toString(36).substr(2, 9);

// Инициализация данных, темы и вкладки
async function loadData() {
    const res = await browser.storage.local.get(['proxies', 'domains', 'rules', 'theme', 'activeTab']);
    appState.proxies = res.proxies || {};
    appState.domains = res.domains || {};
    appState.rules = res.rules || [];
    currentTab = res.activeTab || 'proxies';
    
    // Инициализация темы
    if (res.theme === 'dark') {
        document.body.classList.add('dark');
        document.getElementById('theme-toggle').textContent = '☀️ Светлая тема';
    } else {
        document.body.classList.remove('dark');
        document.getElementById('theme-toggle').textContent = '🌙 Темная тема';
    }

    // Инициализация вкладок
    switchTab(currentTab);
    renderAll();
}

async function saveData() {
    await browser.storage.local.set({
        proxies: appState.proxies,
        domains: appState.domains,
        rules: appState.rules
    });
    renderAll();
}

// --- ЛОГИКА ТЕМЫ ---
document.getElementById('theme-toggle').onclick = async () => {
    const isDark = document.body.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    document.getElementById('theme-toggle').textContent = isDark ? '☀️ Светлая тема' : '🌙 Темная тема';
    await browser.storage.local.set({ theme: newTheme });
};

// --- ЛОГИКА ВКЛАДОК ---
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', async () => {
        const tabName = button.getAttribute('data-tab');
        switchTab(tabName);
        await browser.storage.local.set({ activeTab: tabName });
    });
});

function switchTab(tabName) {
    currentTab = tabName;
    
    // Переключаем активные кнопки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Скрываем/показываем контейнеры контента
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-content-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

function renderAll() {
    renderProxies();
    renderDomains();
    renderRules();
    updateRuleSelects();
}

function renderProxies() {
    const list = document.getElementById('proxy-list');
    list.innerHTML = '';
    
    if (Object.keys(appState.proxies).length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted); font-size:0.875rem;">Список прокси пуст</div>';
        return;
    }

    for (const [id, p] of Object.entries(appState.proxies)) {
        if (!p) continue;
        
        const row = document.createElement('div');
        row.className = 'card-row';
        
        const info = document.createElement('div');
        info.className = 'card-info';
        
        const title = document.createElement('span');
        title.className = 'card-title';
        title.textContent = p.name || 'Proxy';
        
        const badge = document.createElement('span');
        badge.className = `badge ${p.username ? 'badge-auth' : 'badge-noauth'}`;
        badge.textContent = p.username ? 'с авторизацией' : 'открытый';
        title.appendChild(badge);

        const sub = document.createElement('span');
        sub.className = 'card-sub';
        sub.textContent = `${p.type.toUpperCase()} -> ${p.host}:${p.port}`;
        
        info.appendChild(title);
        info.appendChild(sub);
        
        const controls = document.createElement('div');
        controls.className = 'controls-wrapper';
        
        const statusSpan = document.createElement('span');
        statusSpan.id = `status-${id}`;
        statusSpan.className = 'status-text';
        
        const testBtn = document.createElement('button');
        testBtn.className = 'btn-test';
        testBtn.textContent = 'Тест';
        testBtn.addEventListener('click', () => testProxy(id));
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.textContent = 'Ред.';
        editBtn.addEventListener('click', () => startEditProxy(id));
        
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-del';
        delBtn.textContent = 'Удалить';
        delBtn.addEventListener('click', () => deleteItem('proxies', id));
        
        controls.appendChild(statusSpan);
        controls.appendChild(testBtn);
        controls.appendChild(editBtn);
        controls.appendChild(delBtn);
        
        row.appendChild(info);
        row.appendChild(controls);
        list.appendChild(row);
    }
}

function renderDomains() {
    const list = document.getElementById('domain-list');
    list.innerHTML = '';
    
    if (Object.keys(appState.domains).length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted); font-size:0.875rem;">Списки масок не созданы</div>';
        return;
    }

    for (const [id, d] of Object.entries(appState.domains)) {
        if (!d) continue;
        let listArray = Array.isArray(d.list) ? d.list : (Array.isArray(d) ? d : []);

        const row = document.createElement('div');
        row.className = 'card-row';
        
        const info = document.createElement('div');
        info.className = 'card-info';
        
        const title = document.createElement('span');
        title.className = 'card-title';
        title.textContent = d.name || 'Список масок';
        
        const sub = document.createElement('span');
        sub.className = 'card-sub';
        sub.textContent = listArray.join(', ');
        
        info.appendChild(title);
        info.appendChild(sub);
        
        const controls = document.createElement('div');
        controls.className = 'controls-wrapper';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.textContent = 'Ред.';
        editBtn.addEventListener('click', () => startEditDomain(id));

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-del';
        delBtn.textContent = 'Удалить';
        delBtn.addEventListener('click', () => deleteItem('domains', id));
        
        controls.appendChild(editBtn);
        controls.appendChild(delBtn);

        row.appendChild(info);
        row.appendChild(controls);
        list.appendChild(row);
    }
}

function renderRules() {
    const list = document.getElementById('rule-list');
    list.innerHTML = '';
    
    if (appState.rules.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted); font-size:0.875rem;">Нет активных правил трафика</div>';
        return;
    }

    appState.rules.forEach((r, index) => {
        if (!r) return;
        const dName = appState.domains[r.domainListId]?.name || "Удаленный список";
        const pName = appState.proxies[r.proxyId]?.name || "Удаленный прокси";
        
        const row = document.createElement('div');
        row.className = 'card-row';
        
        const info = document.createElement('div');
        info.className = 'card-info';
        
        const title = document.createElement('span');
        title.className = 'card-title';
        title.innerHTML = `Если подходит под маски <span style="color:var(--primary)">[${dName}]</span>`;
        
        const sub = document.createElement('span');
        sub.className = 'card-sub';
        sub.innerHTML = `Направлять через прокси: <b>${pName}</b>`;
        
        info.appendChild(title);
        info.appendChild(sub);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-del';
        delBtn.textContent = 'Отключить';
        delBtn.addEventListener('click', () => deleteRule(index));
        
        row.appendChild(info);
        row.appendChild(delBtn);
        list.appendChild(row);
    });
}

function updateRuleSelects() {
    const rDomain = document.getElementById('r-domain');
    const rProxy = document.getElementById('r-proxy');
    if (!rDomain || !rProxy) return;
    
    rDomain.innerHTML = ''; 
    rProxy.innerHTML = '';
    
    const activeDomainIds = appState.rules.map(rule => rule.domainListId);

    const availableDomains = Object.entries(appState.domains).filter(([id, d]) => {
        return d && !activeDomainIds.includes(id);
    });
    
    if (availableDomains.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = Object.keys(appState.domains).length === 0 
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

    if (Object.keys(appState.proxies).length === 0) {
        rProxy.innerHTML = '<option value="">-- Сначала добавьте прокси --</option>';
    } else {
        for (const [id, p] of Object.entries(appState.proxies)) {
            if (!p) continue;
            const opt = document.createElement('option');
            opt.value = id; 
            opt.textContent = `Прокси: ${p.name} (${p.type.toUpperCase()})`;
            rProxy.appendChild(opt);
        }
    }
}

document.getElementById('btn-add-proxy').onclick = () => {
    const host = document.getElementById('p-host').value.trim();
    const port = document.getElementById('p-port').value.trim();
    if (!host || !port) return alert('Заполните поля Host и Port');

    const targetId = editingProxyId ? editingProxyId : genId();
    appState.proxies[targetId] = {
        name: document.getElementById('p-name').value.trim() || 'Proxy',
        type: document.getElementById('p-type').value,
        host: host,
        port: port,
        username: document.getElementById('p-user').value.trim() || null,
        password: document.getElementById('p-pass').value.trim() || null
    };
    saveData();
    resetProxyForm();
};

function startEditProxy(id) {
    editingProxyId = id;
    const p = appState.proxies[id];
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-type').value = p.type;
    document.getElementById('p-host').value = p.host;
    document.getElementById('p-port').value = p.port;
    document.getElementById('p-user').value = p.username || '';
    document.getElementById('p-pass').value = p.password || '';
    document.getElementById('btn-add-proxy').textContent = 'Обновить данные';
    document.getElementById('cancel-edit').style.display = 'inline-block';
}

function resetProxyForm() {
    editingProxyId = null;
    document.getElementById('p-name').value = '';
    document.getElementById('p-host').value = '';
    document.getElementById('p-port').value = '';
    document.getElementById('p-user').value = '';
    document.getElementById('p-pass').value = '';
    document.getElementById('btn-add-proxy').textContent = 'Добавить прокси';
    document.getElementById('cancel-edit').style.display = 'none';
}
document.getElementById('cancel-edit').onclick = resetProxyForm;

document.getElementById('btn-add-domain').onclick = () => {
    const nameInput = document.getElementById('d-name').value.trim();
    const rawDomains = document.getElementById('d-domains').value.trim();
    if (!rawDomains) return alert('Введите список доменов или масок');

    const parsedList = rawDomains.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const targetId = editingDomainId ? editingDomainId : genId();
    appState.domains[targetId] = {
        name: nameInput || 'Список Масок',
        list: parsedList
    };
    
    saveData();
    resetDomainForm();
};

function startEditDomain(id) {
    editingDomainId = id;
    const d = appState.domains[id];
    let listArray = Array.isArray(d.list) ? d.list : (Array.isArray(d) ? d : []);
    
    document.getElementById('d-name').value = d.name || '';
    document.getElementById('d-domains').value = listArray.join('\n');
    
    document.getElementById('btn-add-domain').textContent = 'Обновить список';
    document.getElementById('cancel-domain-edit').style.display = 'inline-block';
}

function resetDomainForm() {
    editingDomainId = null;
    document.getElementById('d-name').value = '';
    document.getElementById('d-domains').value = '';
    document.getElementById('btn-add-domain').textContent = 'Добавить список';
    document.getElementById('cancel-domain-edit').style.display = 'none';
}
document.getElementById('cancel-domain-edit').onclick = resetDomainForm;

document.getElementById('btn-add-rule').onclick = () => {
    const domainListId = document.getElementById('r-domain').value;
    const proxyId = document.getElementById('r-proxy').value;
    
    if (!domainListId || !proxyId || domainListId === "" || proxyId === "") {
        return alert('Пожалуйста, выберите существующий список масок и прокси-сервер для создания правила.');
    }

    appState.rules.push({ domainListId, proxyId });
    saveData();
};

function deleteItem(type, id) {
    delete appState[type][id];
    if (type === 'domains') {
        appState.rules = appState.rules.filter(r => r.domainListId !== id);
        if (editingDomainId === id) resetDomainForm();
    }
    if (type === 'proxies') {
        appState.rules = appState.rules.filter(r => r.proxyId !== id);
        if (editingProxyId === id) resetProxyForm();
    }
    saveData();
}

function deleteRule(index) {
    appState.rules.splice(index, 1);
    saveData();
}

async function testProxy(id) {
    const proxy = appState.proxies[id];
    const statusEl = document.getElementById(`status-${id}`);
    statusEl.textContent = "⌛ Ждем...";
    statusEl.style.color = "orange";
    try {
        const response = await browser.runtime.sendMessage({ action: 'testProxy', proxy });
        if (response && response.success) {
            statusEl.textContent = `✅ OK (${response.duration} ms)`;
            statusEl.style.color = "var(--text-success)";
        } else {
            statusEl.textContent = "❌ Ошибка";
            statusEl.style.color = "#991b1b";
        }
    } catch (e) {
        statusEl.textContent = "❌ Сбой";
        statusEl.style.color = "#991b1b";
    }
}

loadData();

// Автоматический парсинг быстрых ссылок при вставке в поле Host
document.getElementById('p-host').addEventListener('input', function(e) {
    const value = e.target.value.trim();
    
    // Регулярное выражение для разбора форматов:
    // protocol://[user:pass@]host:port
    const proxyRegex = /^(socks5|http):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/i;
    
    const match = value.match(proxyRegex);
    
    if (match) {
        const [full, protocol, user, pass, host, port] = match;
        
        // 1. Устанавливаем тип (приводим socks5 к socks для соответствия нашему select)
        document.getElementById('p-type').value = protocol.toLowerCase().startsWith('socks') ? 'socks' : 'http';
        
        // 2. Устанавливаем хост
        document.getElementById('p-host').value = host;
        
        // 3. Устанавливаем порт
        document.getElementById('p-port').value = port;
        
        // 4. Заполняем логин и пароль, если они есть
        if (user && pass) {
            document.getElementById('p-user').value = decodeURIComponent(user);
            document.getElementById('p-pass').value = decodeURIComponent(pass);
        }
        
        // Подсветим поля, чтобы было видно, что парсинг прошел успешно
        const fields = ['p-type', 'p-host', 'p-port', 'p-user', 'p-pass'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            el.style.transition = 'background-color 0.5s';
            el.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
            setTimeout(() => el.style.backgroundColor = '', 1000);
        });
    }
});