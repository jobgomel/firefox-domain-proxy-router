// Общая функция тестирования прокси через background-скрипт
// Используется в options.js для тестирования как сохранённых, так и публичных прокси

export async function testProxy(proxy, statusEl) {
    statusEl.textContent = '\u231B Ждем...';
    statusEl.style.color = 'orange';
    try {
        const response = await browser.runtime.sendMessage({ action: 'testProxy', proxy });
        if (response && response.success) {
            statusEl.textContent = `\u2705 OK (${response.duration} ms)`;
            statusEl.style.color = 'var(--text-success)';
        } else {
            statusEl.textContent = '\u274C Ошибка';
            statusEl.style.color = '#991b1b';
        }
    } catch (e) {
        statusEl.textContent = '\u274C Сбой';
        statusEl.style.color = '#991b1b';
    }
}
