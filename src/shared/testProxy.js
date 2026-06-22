// Общая функция тестирования прокси через background-скрипт
// Используется в options.js для тестирования как сохранённых, так и публичных прокси

export async function testProxy(proxy, statusEl) {
    statusEl.textContent = '⌛ Ждем...';
    statusEl.style.color = 'orange';
    try {
        const response = await browser.runtime.sendMessage({ action: 'testProxy', proxy });
        if (response && response.success) {
            statusEl.textContent = `✅ OK (${response.duration} ms)`;
            statusEl.style.color = 'var(--success)';
        } else {
            statusEl.textContent = '❌ Ошибка';
            statusEl.style.color = 'var(--danger)';
        }
    } catch (e) {
        statusEl.textContent = '❌ Сбой';
        statusEl.style.color = 'var(--danger)';
    }
}
