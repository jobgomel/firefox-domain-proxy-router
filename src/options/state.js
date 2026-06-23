// Единый модуль состояния для страницы опций
// Автоматически сохраняет в storage.local и вызывает рендер после каждой мутации

const STORAGE_KEYS = ['proxies', 'domains', 'rules', 'exceptions', 'theme', 'activeTab'];

export class OptionsState {
  constructor(renderFn, storage = browser.storage.local) {
    this._data = { proxies: {}, domains: {}, rules: [], exceptions: [] };
    this._editing = { proxyId: null, domainId: null };
    this._currentTab = 'proxies';
    this._renderFn = typeof renderFn === 'function' ? renderFn : null;
    this._storage = storage;
  }

  // ---- Геттеры данных (только чтение) ----

  get proxies() { return this._data.proxies; }
  get domains() { return this._data.domains; }
  get rules() { return this._data.rules; }
  get exceptions() { return this._data.exceptions; }

  // ---- UI-состояние (не сохраняется) ----

  get editingProxyId() { return this._editing.proxyId; }
  set editingProxyId(v) { this._editing.proxyId = v; }

  get editingDomainId() { return this._editing.domainId; }
  set editingDomainId(v) { this._editing.domainId = v; }

  get currentTab() { return this._currentTab; }
  set currentTab(v) { this._currentTab = v; }

  // ---- Загрузка / сохранение ----

  async load() {
    try {
      const res = await this._storage.get(STORAGE_KEYS);
      this._data.proxies = res.proxies || {};
      this._data.domains = res.domains || {};
      this._data.rules = res.rules || [];
      this._data.exceptions = res.exceptions || [];
      this._currentTab = res.activeTab || 'proxies';
      return { theme: res.theme || 'light' };
    } catch (err) {
      console.error('[OptionsState] Ошибка загрузки:', err);
      this._data = { proxies: {}, domains: {}, rules: [], exceptions: [] };
      return { theme: 'light' };
    }
  }

  async save(renderHint = 'all') {
    try {
      await this._storage.set({ ...this._data });
    } catch (err) {
      console.error('[OptionsState] Ошибка сохранения:', err);
    }
    if (this._renderFn) {
      try { this._renderFn(renderHint); } catch (e) { console.error('[OptionsState] Ошибка рендера:', e); }
    }
  }

  validateDataStructure(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.proxies && typeof data.proxies !== 'object') return false;
    if (data.domains && typeof data.domains !== 'object') return false;
    if (data.rules && !Array.isArray(data.rules)) return false;
    if (data.exceptions && !Array.isArray(data.exceptions)) return false;
    return true;
  }

  // ---- Мутаторы (каждый → save(renderHint) → рендер секции) ----

  addProxy(id, config) {
    this._data.proxies[id] = config;
    return this.save('proxy');
  }

  updateProxy(id, config) {
    this._data.proxies[id] = config;
    return this.save('proxy');
  }

  deleteProxy(id) {
    delete this._data.proxies[id];
    this._data.rules = this._data.rules.filter(r => r.proxyId !== id);
    return this.save('all');
  }

  addDomain(id, data) {
    this._data.domains[id] = data;
    return this.save('domain');
  }

  updateDomain(id, data) {
    this._data.domains[id] = data;
    return this.save('domain');
  }

  deleteDomain(id) {
    delete this._data.domains[id];
    this._data.rules = this._data.rules.filter(r => r.domainListId !== id);
    return this.save('all');
  }

  addRule(rule) {
    this._data.rules.push(rule);
    return this.save('rule');
  }

  deleteRule(index) {
    if (index >= 0 && index < this._data.rules.length) {
      this._data.rules.splice(index, 1);
    }
    return this.save('rule');
  }

  setExceptions(exceptions) {
    if (!Array.isArray(exceptions)) {
      console.warn('[OptionsState] setExceptions: ожидается массив');
      return Promise.resolve();
    }
    this._data.exceptions = exceptions;
    return this.save('exceptions');
  }

  // Полная замена данных (для импорта JSON)
  replaceAll(data) {
    if (!this.validateDataStructure(data)) {
      console.error('[OptionsState] replaceAll: неверная структура данных');
      return Promise.reject(new Error('Неверный формат данных для импорта'));
    }
    this._data.proxies = data.proxies || {};
    this._data.domains = data.domains || {};
    this._data.rules = data.rules || [];
    this._data.exceptions = data.exceptions || [];
    return this.save('all');
  }
}
