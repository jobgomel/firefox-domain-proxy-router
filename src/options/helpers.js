// Фабрики для создания типовых DOM-элементов
// Используются в render-функциях options.js для уменьшения дублирования

export function createCardRow() {
    const el = document.createElement('div');
    el.className = 'card-row';
    return el;
}

export function createCardInfo(titleEl, subEl) {
    const el = document.createElement('div');
    el.className = 'card-info';
    if (titleEl) el.appendChild(titleEl);
    if (subEl) el.appendChild(subEl);
    return el;
}

export function createCardTitle(text) {
    const el = document.createElement('span');
    el.className = 'card-title';
    if (text != null) el.textContent = text;
    return el;
}

export function createCardSub(text) {
    const el = document.createElement('span');
    el.className = 'card-sub';
    if (text != null) el.textContent = text;
    return el;
}

export function createControlsWrapper() {
    const el = document.createElement('div');
    el.className = 'controls-wrapper';
    return el;
}

export function createStatusSpan(id) {
    const el = document.createElement('span');
    el.className = 'status-text';
    if (id != null) el.id = `status-${id}`;
    return el;
}

export function createButton(text, className, onClick) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = text;
    if (typeof onClick === 'function') btn.addEventListener('click', onClick);
    return btn;
}

export function createBadge(text, isAuth) {
    const el = document.createElement('span');
    el.className = `badge ${isAuth ? 'badge-auth' : 'badge-noauth'}`;
    el.textContent = text;
    return el;
}

export function createPlaceholder(text) {
    const div = document.createElement('div');
    div.className = 'placeholder-text';
    div.textContent = text;
    return div;
}
