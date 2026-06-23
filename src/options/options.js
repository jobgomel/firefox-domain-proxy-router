import { OptionsState } from './state.js';
import { applyI18n } from '../shared/i18n.js';
import { setThemeToggle, genId, safeDecodeURIComponent } from './utils.js';
import { renderAll } from './renders.js';
import { setupForms } from './forms.js';
import { setupPublicProxies } from './publicProxies.js';
import { setupExportImport } from './exportImport.js';

// ============================================================
// 1. СОСТОЯНИЕ
// ============================================================

// Создаём state с renderAll как колбэком для авто-рендера после мутаций.
// renderAll принимает state как параметр, поэтому оборачиваем.
const state = new OptionsState((hint) => renderAll(state, hint));

// ============================================================
// 2. ТЕМА
// ============================================================

document.getElementById('theme-toggle').onclick = async () => {
    const isDark = document.body.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    setThemeToggle(isDark);
    await browser.storage.local.set({ theme: newTheme });
};

// ============================================================
// 3. ВКЛАДКИ
// ============================================================

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
// 4. ИНИЦИАЛИЗАЦИЯ
// ============================================================

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
    renderAll(state);
}

document.addEventListener('DOMContentLoaded', () => {
    applyI18n();
});

// ============================================================
// 5. ПОДКЛЮЧЕНИЕ МОДУЛЕЙ (формы, публичные прокси, экспорт/импорт)
// ============================================================

setupForms(state, { genId, safeDecodeURIComponent });
setupPublicProxies(state, { genId });
setupExportImport(state);

// ============================================================
// 6. BOOTSTRAP
// ============================================================

loadData();
