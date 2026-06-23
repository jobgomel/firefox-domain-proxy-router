// Общая функция локализации элементов с атрибутом data-i18n
// Используется в options.js и popup.js

export function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = browser.i18n.getMessage(key);
        if (translation) {
            element.textContent = translation;
        }
    });
}
