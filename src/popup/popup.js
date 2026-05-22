document.addEventListener('DOMContentLoaded', async () => {
    const uiConfig = await browser.storage.local.get(['theme', 'isEnabled', 'routingMode']);
    if (uiConfig.theme === 'dark') {
        document.body.classList.add('dark');
    }

    const toggle = document.getElementById('global-toggle');
    const statusText = document.getElementById('status-text');
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
        statusText.textContent = active ? "🟢 Работает" : "🔴 Отключено";
        statusText.style.color = active ? "#16a34a" : "#dc2626";
    }

    function updateDescription(mode) {
        if (mode === 'global') {
            modeDesc.textContent = "Проксируются любые запросы из любых вкладок, если они совпали со списками.";
        } else {
            modeDesc.textContent = "Прокси включается только если URL в адресной строке вкладки совпадает со списками.";
        }
    }
});