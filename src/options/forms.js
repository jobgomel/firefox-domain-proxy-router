import { testProxy } from '../shared/testProxy.js';

// Module-level state — инициализируется через setupForms()
let _state;

export function setupForms(state, { genId, safeDecodeURIComponent }) {
    _state = state;

    // ===== PROXY FORM =====

    document.getElementById('btn-add-proxy').onclick = () => {
        const host = document.getElementById('p-host').value.trim();
        const port = document.getElementById('p-port').value.trim();
        if (!host || !port) return alert('Заполните поля Host и Port');

        const targetId = _state.editingProxyId || genId();
        const config = {
            name: document.getElementById('p-name').value.trim() || 'Proxy',
            type: document.getElementById('p-type').value,
            host,
            port,
            username: document.getElementById('p-user').value.trim() || null,
            password: document.getElementById('p-pass').value.trim() || null,
        };
        if (_state.editingProxyId) {
            _state.updateProxy(targetId, config).then(resetProxyForm);
        } else {
            _state.addProxy(targetId, config).then(resetProxyForm);
        }
    };

    document.getElementById('cancel-edit').onclick = resetProxyForm;

    // Автоматический парсинг быстрых ссылок при вставке в поле Host
    document.getElementById('p-host').addEventListener('input', function(e) {
        const value = e.target.value.trim();
        const proxyRegex = /^(socks5|http):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/i;
        const match = value.match(proxyRegex);

        if (match) {
            const [full, protocol, user, pass, host, port] = match;

            document.getElementById('p-type').value = protocol.toLowerCase().startsWith('socks') ? 'socks' : 'http';
            document.getElementById('p-host').value = host;
            document.getElementById('p-port').value = port;

            if (user && pass) {
                document.getElementById('p-user').value = safeDecodeURIComponent(user);
                document.getElementById('p-pass').value = safeDecodeURIComponent(pass);
            }

            const fields = ['p-type', 'p-host', 'p-port', 'p-user', 'p-pass'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                el.style.transition = 'background-color 0.5s';
                el.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
                setTimeout(() => el.style.backgroundColor = '', 1000);
            });
        }
    });

    // ===== DOMAIN FORM =====

    document.getElementById('btn-add-domain').onclick = () => {
        const nameInput = document.getElementById('d-name').value.trim();
        const rawDomains = document.getElementById('d-domains').value.trim();
        if (!rawDomains) return alert('Введите список доменов или масок');

        const parsedList = rawDomains.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        const targetId = _state.editingDomainId || genId();
        const data = {
            name: nameInput || 'Список Масок',
            list: parsedList,
        };
        if (_state.editingDomainId) {
            _state.updateDomain(targetId, data).then(resetDomainForm);
        } else {
            _state.addDomain(targetId, data).then(resetDomainForm);
        }
    };

    document.getElementById('cancel-domain-edit').onclick = resetDomainForm;

    // ===== RULE FORM =====

    document.getElementById('btn-add-rule').onclick = () => {
        const domainListId = document.getElementById('r-domain').value;
        const proxyId = document.getElementById('r-proxy').value;

        if (!domainListId || !proxyId || domainListId === "" || proxyId === "") {
            return alert('Пожалуйста, выберите существующий список масок и прокси-сервер для создания правила.');
        }

        _state.addRule({ domainListId, proxyId });
    };

    // ===== EXCEPTIONS =====

    document.getElementById('btn-save-exceptions').onclick = async () => {
        const rawExceptions = document.getElementById('ex-domains').value.trim();

        const parsedExceptions = rawExceptions
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        await _state.setExceptions(parsedExceptions);

        const saveBtn = document.getElementById('btn-save-exceptions');
        const oldBg = saveBtn.style.backgroundColor;
        const oldText = saveBtn.textContent;

        saveBtn.style.backgroundColor = '#16a34a';
        saveBtn.textContent = '✓ Сохранено!';

        setTimeout(() => {
            saveBtn.style.backgroundColor = oldBg;
            saveBtn.textContent = oldText;
        }, 1200);
    };
}

// ===== Exported actions (используются в renders.js) =====

export function startEditProxy(id) {
    _state.editingProxyId = id;
    const p = _state.proxies[id];
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-type').value = p.type;
    document.getElementById('p-host').value = p.host;
    document.getElementById('p-port').value = p.port;
    document.getElementById('p-user').value = p.username || '';
    document.getElementById('p-pass').value = p.password || '';
    document.getElementById('btn-add-proxy').textContent = 'Обновить данные';
    document.getElementById('cancel-edit').style.display = 'inline-block';
}

export function resetProxyForm() {
    _state.editingProxyId = null;
    document.getElementById('p-name').value = '';
    document.getElementById('p-host').value = '';
    document.getElementById('p-port').value = '';
    document.getElementById('p-user').value = '';
    document.getElementById('p-pass').value = '';
    document.getElementById('btn-add-proxy').textContent = 'Добавить прокси';
    document.getElementById('cancel-edit').style.display = 'none';
}

export function startEditDomain(id) {
    _state.editingDomainId = id;
    const d = _state.domains[id];
    let listArray = Array.isArray(d.list) ? d.list : (Array.isArray(d) ? d : []);

    document.getElementById('d-name').value = d.name || '';
    document.getElementById('d-domains').value = listArray.join('\n');

    document.getElementById('btn-add-domain').textContent = 'Обновить список';
    document.getElementById('cancel-domain-edit').style.display = 'inline-block';
}

export function resetDomainForm() {
    _state.editingDomainId = null;
    document.getElementById('d-name').value = '';
    document.getElementById('d-domains').value = '';
    document.getElementById('btn-add-domain').textContent = 'Добавить список';
    document.getElementById('cancel-domain-edit').style.display = 'none';
}

export function deleteItem(type, id) {
    if (type === 'proxies') {
        if (_state.editingProxyId === id) resetProxyForm();
        _state.deleteProxy(id);
    } else if (type === 'domains') {
        if (_state.editingDomainId === id) resetDomainForm();
        _state.deleteDomain(id);
    }
}

export function deleteRule(index) {
    _state.deleteRule(index);
}

export function testProxyById(id) {
    const proxy = _state.proxies[id];
    if (!proxy) return;
    const statusEl = document.getElementById(`status-${id}`);
    if (!statusEl) return;
    testProxy(proxy, statusEl);
}
