document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем тему оформления для соответствия стилю
    const uiConfig = await browser.storage.local.get(['theme', 'isEnabled']);
    if (uiConfig.theme === 'dark') {
        document.body.classList.add('dark');
    }

    const toggle = document.getElementById('global-toggle');
    const statusText = document.getElementById('status-text');

    // Состояние по умолчанию: true (если еще не задано)
    const isEnabled = uiConfig.isEnabled !== false;
    toggle.checked = isEnabled;
    updateStatusText(isEnabled);

    // Изменение состояния тумблера
    toggle.onchange = async () => {
        const active = toggle.checked;
        updateStatusText(active);
        await browser.storage.local.set({ isEnabled: active });
    };

    // Открытие полноценной страницы настроек
    document.getElementById('open-settings').onclick = () => {
        browser.runtime.openOptionsPage();
        window.close(); // Закрываем всплывашку
    };

    function updateStatusText(active) {
        statusText.textContent = active ? "🟢 Работает" : "🔴 Отключено";
        statusText.style.color = active ? "#16a34a" : "#dc2626";
    }
});