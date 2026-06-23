import { applyI18n } from '../shared/i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
    applyI18n();

    const uiConfig = await browser.storage.local.get(['theme', 'isEnabled', 'routingMode']);
    if (uiConfig.theme === 'dark') {
        document.body.classList.add('dark');
    }

    const toggle = document.getElementById('global-toggle');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-label');
    const statusCard = document.getElementById('status-card');
    const modeDesc = document.getElementById('mode-desc');
    const selectWrapper = document.getElementById('routing-mode-wrapper');
    const selectTrigger = document.getElementById('routing-mode-trigger');
    const selectDropdown = document.getElementById('routing-mode-dropdown');
    const selectText = document.getElementById('routing-mode-text');
    const selectOptions = selectDropdown.querySelectorAll('.select-option');

    // 1. Настройка главного тумблера
    const isEnabled = uiConfig.isEnabled !== false;
    toggle.checked = isEnabled;
    updateStatusText(isEnabled);

    toggle.onchange = async () => {
        const active = toggle.checked;
        updateStatusText(active);
        await browser.storage.local.set({ isEnabled: active });
    };

    // 2. Настройка режима маршрутизации
    let currentMode = uiConfig.routingMode || 'global';
    setMode(currentMode);
    updateDescription(currentMode);

    // Открытие/закрытие дропдауна
    selectTrigger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = selectWrapper.classList.contains('open');
        closeDropdown();
        if (!isOpen) {
            selectWrapper.classList.add('open');
            selectTrigger.setAttribute('aria-expanded', 'true');
        }
    };

    // Выбор опции
    selectOptions.forEach(option => {
        option.onclick = () => {
            const value = option.getAttribute('data-value');
            if (value !== currentMode) {
                setMode(value);
                updateDescription(value);
                browser.storage.local.set({ routingMode: value });
            }
            closeDropdown();
        };
    });

    // Закрытие по клику вне
    document.addEventListener('click', closeDropdown);

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && selectWrapper.classList.contains('open')) {
            closeDropdown();
            selectTrigger.focus();
        }
    });

    function setMode(value) {
        currentMode = value;
        selectOptions.forEach(opt => {
            const isSelected = opt.getAttribute('data-value') === value;
            opt.classList.toggle('selected', isSelected);
            opt.setAttribute('aria-selected', isSelected);
            if (isSelected) {
                selectText.textContent = opt.querySelector('span:last-child').textContent;
                const iconSvg = opt.querySelector('.select-option-icon svg');
                const triggerIcon = selectTrigger.querySelector('.select-trigger-icon svg');
                if (iconSvg && triggerIcon) {
                    triggerIcon.replaceWith(iconSvg.cloneNode(true));
                }
            }
        });
    }

    function closeDropdown() {
        selectWrapper.classList.remove('open');
        selectTrigger.setAttribute('aria-expanded', 'false');
    }

    // 3. Открытие настроек
    document.getElementById('open-settings').onclick = () => {
        browser.runtime.openOptionsPage();
        window.close();
    };

    // 4. Статистика проксированных хостов в активной вкладке
    const statsTrigger = document.getElementById('stats-trigger');
    const statsList = document.getElementById('stats-list');
    const statsCount = document.getElementById('stats-count');
    const statsEmpty = document.getElementById('stats-empty');

    statsTrigger.onclick = () => {
        const isOpen = document.getElementById('proxy-stats').classList.toggle('open');
        statsTrigger.setAttribute('aria-expanded', isOpen);
    };

    // Загружаем статистику и подключаем live-обновления
    (async () => {
        try {
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!activeTab || !activeTab.id) {
                showEmptyStats();
                return;
            }

            const port = browser.runtime.connect({ name: 'popup-stats' });

            // Шлём начальный запрос — background ответит statsUpdate
            port.postMessage({ action: 'getTabStats', tabId: activeTab.id });

            // Фон будет присылать statsUpdate при каждом новом прокси-запросе
            port.onMessage.addListener((msg) => {
                if (msg.action === 'statsUpdate') {
                    renderStats(msg.stats);
                }
            });

            port.onDisconnect.addListener(() => {
                // Popup закрылся — порт автоматом рвётся, чистить ничего не надо
            });
        } catch (err) {
            console.warn('[Popup] Не удалось получить статистику:', err.message);
            showEmptyStats();
        }
    })();

    function renderStats(stats) {
        if (!stats || stats.length === 0) {
            showEmptyStats();
            return;
        }
        statsCount.textContent = stats.length;
        statsList.textContent = ''; // очищаем безопасно
        for (const item of stats) {
            const li = document.createElement('li');
            li.className = 'stats-item';

            const hostSpan = document.createElement('span');
            hostSpan.className = 'stats-host';
            hostSpan.textContent = item.hostname;

            const countSpan = document.createElement('span');
            countSpan.className = 'stats-req-count';
            countSpan.textContent = item.count;

            li.append(hostSpan, countSpan);
            statsList.append(li);
        }
        statsList.style.display = '';
        statsEmpty.style.display = 'none';
    }

    function showEmptyStats() {
        statsCount.textContent = '0';
        statsList.style.display = 'none';
        statsEmpty.style.display = '';
    }

    /**
     * Обновляет статус-бар в popup.
     * Использует HTML-элементы: #status-icon, #status-label, #status-card
     * @param {boolean} active — true = прокси включён
     */
    function updateStatusText(active) {
        statusIcon.classList.toggle('disable', !active);
        statusText.textContent = active
                ? browser.i18n.getMessage("statusEnabled")
                : browser.i18n.getMessage("statusDisabled");
        statusCard.classList.toggle('active', active);
    }

    /**
     * Обновляет описание режима маршрутизации.
     * Использует HTML-элемент: #mode-desc
     * @param {string} mode — 'global' или 'tab'
     */
    function updateDescription(mode) {
        if (mode === 'global') {
            modeDesc.textContent = "Проксируются любые запросы из любых вкладок, если они совпали со списками.";
        } else {
            modeDesc.textContent = "Прокси включается только если URL в адресной строке вкладки совпадает со списками.";
        }
    }
});