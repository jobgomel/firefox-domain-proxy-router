// Утилиты для страницы опций

export const genId = () => crypto.randomUUID();

export function safeDecodeURIComponent(str) {
    try { return decodeURIComponent(str); }
    catch (e) { return str; }
}

export function setThemeToggle(isDark) {
    const btn = document.getElementById('theme-toggle');
    btn.replaceChildren();
    const templateId = isDark ? 'icon-sun' : 'icon-moon';
    btn.appendChild(document.getElementById(templateId).content.cloneNode(true));
    const span = document.createElement('span');
    span.textContent = isDark ? 'Светлая тема' : 'Темная тема';
    btn.appendChild(span);
}

export function setPlaceholder(el, text) {
    const div = document.createElement('div');
    div.style.cssText = 'color:var(--text-muted); font-size:0.875rem;';
    div.textContent = text;
    el.replaceChildren(div);
}

export function setSelectPlaceholder(el, text) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = text;
    el.replaceChildren(opt);
}
