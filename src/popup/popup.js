document.addEventListener('DOMContentLoaded', async () => {
    // Находим все элементы с атрибутом data-i18n и переводим их
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = browser.i18n.getMessage(key);
        if (translation) {
            element.textContent = translation;
        }
    });

    const uiConfig = await browser.storage.local.get(['theme', 'isEnabled', 'routingMode']);
    if (uiConfig.theme === 'dark') {
        document.body.classList.add('dark');
    }

    const toggle = document.getElementById('global-toggle');
    const statusText = document.getElementById('status-label');
    const statusCard = document.getElementById('status-card');
    const modeSelect = document.getElementById('routing-mode');
    const modeDesc = document.getElementById('mode-desc');

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
    const currentMode = uiConfig.routingMode || 'global';
    modeSelect.value = currentMode;
    updateDescription(currentMode);

    modeSelect.onchange = async () => {
        const selectedMode = modeSelect.value;
        updateDescription(selectedMode);
        await browser.storage.local.set({ routingMode: selectedMode });
    };

    // 3. Открытие настроек
    document.getElementById('open-settings').onclick = () => {
        browser.runtime.openOptionsPage();
        window.close();
    };

    function updateStatusText(active) {
        statusText.textContent = active
                ? browser.i18n.getMessage("statusEnabled")
                : browser.i18n.getMessage("statusDisabled");
        statusCard.classList.toggle('active', active);
    }

    function updateDescription(mode) {
        if (mode === 'global') {
            modeDesc.textContent = "Проксируются любые запросы из любых вкладок, если они совпали со списками.";
        } else {
            modeDesc.textContent = "Прокси включается только если URL в адресной строке вкладки совпадает со списками.";
        }
    }
});