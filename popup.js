const api = typeof browser !== "undefined" ? browser : chrome;

const toggle = document.getElementById('toggle');
const proxyAddr = document.getElementById('proxyAddr');
const domainsInput = document.getElementById('domains');
const saveBtn = document.getElementById('save');
const msg = document.getElementById('msg');

// Загрузка
api.storage.local.get(['proxyDomains', 'proxyServer', 'proxyEnabled'], (data) => {
  toggle.checked = data.proxyEnabled === true;
  proxyAddr.value = data.proxyServer || '127.0.0.1:8080';
  domainsInput.value = (data.proxyDomains || []).join('\n');
});

// Тумблер
toggle.addEventListener('change', () => {
  api.storage.local.set({ proxyEnabled: toggle.checked });
  msg.textContent = toggle.checked ? "Включено" : "Выключено";
});

// Сохранение
saveBtn.addEventListener('click', () => {
  const domains = domainsInput.value.split('\n').map(s => s.trim()).filter(s => s);
  const server = proxyAddr.value.trim();

  if (!server) {
    msg.textContent = "⚠️ Введите адрес прокси!";
    msg.style.color = "red";
    return;
  }

  api.storage.local.set({
    proxyDomains: domains,
    proxyServer: server
  }, () => {
    msg.textContent = "✅ Сохранено!";
    msg.style.color = "green";
    setTimeout(() => msg.textContent = "", 2000);
  });
});