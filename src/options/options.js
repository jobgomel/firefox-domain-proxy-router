import { OptionsState } from './state.js';
import { testProxy } from '../shared/testProxy.js';
import { applyI18n } from '../shared/i18n.js';
import { createCardRow, createCardInfo, createCardTitle, createCardSub, createControlsWrapper, createStatusSpan, createButton, createBadge, createPlaceholder } from './helpers.js';

const state = new OptionsState(renderAll);

const genId = () => '_' + Math.random().toString(36).substr(2, 9);

// Безопасное заполнение кнопки темы из HTML-шаблонов
function setThemeToggle(isDark) {
	const btn = document.getElementById('theme-toggle');
	btn.replaceChildren();
	const templateId = isDark ? 'icon-sun' : 'icon-moon';
	btn.appendChild(document.getElementById(templateId).content.cloneNode(true));
	const span = document.createElement('span');
	span.textContent = isDark ? 'Светлая тема' : 'Темная тема';
	btn.appendChild(span);
}

// Безопасное создание элемента-заглушки (только текст, без HTML)
function setPlaceholder(el, text) {
	const div = document.createElement('div');
	div.style.cssText = 'color:var(--text-muted); font-size:0.875rem;';
	div.textContent = text;
	el.replaceChildren(div);
}

// Безопасное создание option в select
function setSelectPlaceholder(el, text) {
	const opt = document.createElement('option');
	opt.value = '';
	opt.textContent = text;
	el.replaceChildren(opt);
}

// ============================================================
// 3. ИНИЦИАЛИЗАЦИЯ
// ============================================================

// Инициализация данных, темы и вкладки
async function loadData() {
	const { theme } = await state.load();

	if (theme === 'dark') {
		document.body.classList.add('dark');
		setThemeToggle(true);
	} else {
		document.body.classList.remove('dark');
		setThemeToggle(false);
	}

	document.getElementById('ex-domains').value = state.exceptions.join('\n');
	switchTab(state.currentTab);
	renderAll();
}

// --- ЯЫКОВАЯ ЛОКАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', async () => {
	applyI18n();
});

// --- ЛОГИКА ТЕМЫ ---
document.getElementById('theme-toggle').onclick = async () => {
	const isDark = document.body.classList.toggle('dark');
	const newTheme = isDark ? 'dark' : 'light';
	setThemeToggle(isDark);
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
	state.currentTab = tabName;
	document.querySelectorAll('.tab-btn').forEach(btn => {
		btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
	});
	document.querySelectorAll('.tab-content').forEach(content => {
		content.classList.toggle('active', content.id === `tab-content-${tabName}`);
	});
}

// ============================================================
// 4. РЕНДЕРЫ
// ============================================================

function renderAll() {
	renderProxies();
	renderDomains();
	renderRules();
	updateRuleSelects();
}

function renderProxies() {
	const list = document.getElementById('proxy-list');
	list.innerHTML = '';

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

function renderDomains() {
	const list = document.getElementById('domain-list');
	list.innerHTML = '';

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

function renderRules() {
	const list = document.getElementById('rule-list');
	list.innerHTML = '';

	if (state.rules.length === 0) {
		list.appendChild(createPlaceholder('Нет активных правил трафика'));
		return;
	}

	state.rules.forEach((r, index) => {
		if (!r) return;
		const dName = state.domains[r.domainListId]?.name || "Удаленный список";
		const pName = state.proxies[r.proxyId]?.name || "Удаленный прокси";

		// Собираем title из нескольких частей (безопасно, без innerHTML)
		const title = document.createElement('span');
		title.className = 'card-title';
		title.appendChild(document.createTextNode('Если подходит под маски '));
		const domainSpan = document.createElement('span');
		domainSpan.style.color = 'var(--primary)';
		domainSpan.textContent = `[${dName}]`;
		title.appendChild(domainSpan);

		// Собираем sub из нескольких частей
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

function updateRuleSelects() {
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

// ============================================================
// 5. ФОРМЫ И ЭКШЕНЫ
// ============================================================

document.getElementById('btn-add-proxy').onclick = () => {
	const host = document.getElementById('p-host').value.trim();
	const port = document.getElementById('p-port').value.trim();
	if (!host || !port) return alert('Заполните поля Host и Port');

	const targetId = state.editingProxyId || genId();
	const config = {
		name: document.getElementById('p-name').value.trim() || 'Proxy',
		type: document.getElementById('p-type').value,
		host,
		port,
		username: document.getElementById('p-user').value.trim() || null,
		password: document.getElementById('p-pass').value.trim() || null,
	};
	if (state.editingProxyId) {
		state.updateProxy(targetId, config).then(resetProxyForm);
	} else {
		state.addProxy(targetId, config).then(resetProxyForm);
	}
};

function startEditProxy(id) {
	state.editingProxyId = id;
	const p = state.proxies[id];
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
	state.editingProxyId = null;
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

	const targetId = state.editingDomainId || genId();
	const data = {
		name: nameInput || 'Список Масок',
		list: parsedList,
	};
	if (state.editingDomainId) {
		state.updateDomain(targetId, data).then(resetDomainForm);
	} else {
		state.addDomain(targetId, data).then(resetDomainForm);
	}
};

function startEditDomain(id) {
	state.editingDomainId = id;
	const d = state.domains[id];
	let listArray = Array.isArray(d.list) ? d.list : (Array.isArray(d) ? d : []);

	document.getElementById('d-name').value = d.name || '';
	document.getElementById('d-domains').value = listArray.join('\n');

	document.getElementById('btn-add-domain').textContent = 'Обновить список';
	document.getElementById('cancel-domain-edit').style.display = 'inline-block';
}

function resetDomainForm() {
	state.editingDomainId = null;
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

	state.addRule({ domainListId, proxyId });
};

function deleteItem(type, id) {
	if (type === 'proxies') {
		if (state.editingProxyId === id) resetProxyForm();
		state.deleteProxy(id);
	} else if (type === 'domains') {
		if (state.editingDomainId === id) resetDomainForm();
		state.deleteDomain(id);
	}
}

function deleteRule(index) {
	state.deleteRule(index);
}

function testProxyById(id) {
	const proxy = state.proxies[id];
	if (!proxy) return;
	const statusEl = document.getElementById(`status-${id}`);
	if (!statusEl) return;
	testProxy(proxy, statusEl);
}

// ============================================================
// 6. ОБРАБОТЧИКИ СОБЫТИЙ (парсинг, исключения, экспорт, импорт)
// ============================================================

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

// Обработчик сохранения списка исключений
document.getElementById('btn-save-exceptions').onclick = async () => {
	const rawExceptions = document.getElementById('ex-domains').value.trim();

	const parsedExceptions = rawExceptions
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);

	await state.setExceptions(parsedExceptions);

	// Визуальный фидбек для пользователя (кнопка на секунду позеленеет)
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

// Экспорт в JSON
document.getElementById('btn-export-settings').onclick = () => {
	const backupData = {
		version: "1.0",
		proxies: state.proxies,
		domains: state.domains,
		rules: state.rules,
		exceptions: state.exceptions,
	};

	const jsonString = JSON.stringify(backupData, null, 2);
	const blob = new Blob([jsonString], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = `proxy_router_backup_${new Date().toISOString().slice(0,10)}.json`;
	document.body.appendChild(link);
	link.click();

	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

// Проксирование клика с красивой кнопки на скрытый input[type="file"]
const fileInput = document.getElementById('import-file-input');
const triggerBtn = document.getElementById('btn-trigger-import');
const importBtn = document.getElementById('btn-import-settings');
const statusDiv = document.getElementById('import-file-status');

triggerBtn.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
	const file = e.target.files[0];
	if (file) {
		statusDiv.replaceChildren();
		statusDiv.appendChild(document.createTextNode(`Выбран файл: ${file.name}`));
		statusDiv.style.color = 'var(--text-main)';
		importBtn.style.display = 'inline-flex';
	} else {
		statusDiv.textContent = 'Файл не выбран';
		statusDiv.style.color = 'var(--text-muted)';
		importBtn.style.display = 'none';
	}
};

// Чтение файла и импорт данных
importBtn.onclick = () => {
	const file = fileInput.files[0];
	if (!file) return;

	if (!confirm('Вы уверены, что хотите ЗАМЕНИТЬ все текущие настройки данными из файла? Это действие нельзя отменить.')) {
		return;
	}

	const reader = new FileReader();
	reader.onload = async (event) => {
		try {
			const importedData = JSON.parse(event.target.result);

			await state.replaceAll(importedData);
			document.getElementById('ex-domains').value = state.exceptions.join('\n');

			fileInput.value = '';
			importBtn.style.display = 'none';
			statusDiv.textContent = '✅ Настройки успешно импортированы!';
			statusDiv.style.color = 'var(--text-success)';

			alert('Настройки успешно восстановлены!');
		} catch (err) {
			alert('Ошибка при чтении файла: Убедитесь, что это корректный файл конфигурации JSON.');
			console.error(err);
		}
	};
	reader.readAsText(file);
};

// ============================================================
// 7. ПУБЛИЧНЫЕ ПРОКСИ
// ============================================================

let publicProxiesData = [];

const btnOpenPub = document.getElementById('btn-open-public-proxies');
const modalPub = document.getElementById('public-proxies-modal');
const btnClosePub = document.getElementById('btn-close-modal');
const btnRefreshPub = document.getElementById('btn-refresh-pub');
const filterProto = document.getElementById('pub-filter-protocol');
const filterGeo = document.getElementById('pub-filter-geo');
const pubListContainer = document.getElementById('pub-proxy-list');
const pubLoading = document.getElementById('pub-loading');

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

async function fetchPublicProxies() {
	pubListContainer.innerHTML = '';
	pubLoading.style.display = 'block';
	try {
		const res = await fetch('https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.json', { cache: 'no-store' });
		if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

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
		const errDiv = document.createElement('div');
		errDiv.style.cssText = 'color:#dc2626; padding:1rem;';
		errDiv.textContent = `❌ Ошибка загрузки списка: ${err.message}`;
		pubListContainer.replaceChildren(errDiv);
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

function resetPublicProxyFilters() {
	filterProto.value = '';
	filterGeo.value = '';
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
	pubListContainer.innerHTML = '';
	const protoFilter = filterProto.value;
	const geoFilter = filterGeo.value;

	const filtered = publicProxiesData.filter(p => {
		if (protoFilter && p.protocol !== protoFilter) return false;
		if (geoFilter && (!p.geolocation || p.geolocation.country !== geoFilter)) return false;
		return true;
	});

	const limited = filtered.slice(0, 100);

	if (limited.length === 0) {
		const emptyDiv = document.createElement('div');
		emptyDiv.style.cssText = 'color:var(--text-muted); text-align:center; padding:1rem;';
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
		badge.style.cssText = 'background:#e0e7ff; color:#4338ca;';
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
				btn.style.backgroundColor = 'var(--text-success)';
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

// ============================================================
// 8. BOOTSTRAP
// ============================================================

loadData();
