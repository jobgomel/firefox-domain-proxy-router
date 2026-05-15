// background.js

// 🔄 Универсальный API-адаптер
const api = typeof browser !== "undefined" ? browser : chrome;

const DEFAULT_PROXY = "127.0.200.1:8080";
let blobUrl = null;

// 🎨 Генерация иконки через обычный Canvas (работает везде)
function generateIconData(enabled) {
  const size = 32;
  
  // Создаем canvas (в Firefox это должен быть обычный canvas, не OffscreenCanvas)
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const strokeColor = enabled ? '#16a34a' : '#9ca3af';
  const globeColor = enabled ? '#3b82f6' : '#9ca3af';
  
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Внешняя рамка
  ctx.beginPath();
  ctx.arc(16, 16, 13, 0, Math.PI * 2);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  
  // Глобус
  const r = 7;
  ctx.strokeStyle = globeColor;
  ctx.lineWidth = 1.5;
  
  ctx.beginPath(); ctx.arc(16, 16, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(16, 13.5, r*0.7, 2, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(16, 16, r*0.9, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(16, 18.5, r*0.7, 2, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(13, 16, 2.5, r*0.7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16, 9); ctx.lineTo(16, 23); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(19, 16, 2.5, r*0.7, 0, 0, Math.PI * 2); ctx.stroke();
  
  return canvas.toDataURL('image/png');
}

function updateIcon(enabled) {
  try {
    const dataUrl = generateIconData(enabled);
    api.action.setIcon({ path: { "32": dataUrl } });
    api.action.setTitle({ title: enabled ? "Прокси: ВКЛ" : "Прокси: ВЫКЛ" });
  } catch (e) {
    console.warn("Icon error:", e);
  }
}

// 🌐 Настройка прокси
async function applyProxy(isEnabled, domains, proxyServer) {
  if (!isEnabled || !domains.length) {
    await api.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = null;
    return;
  }

  const pacScript = `
    function FindProxyForURL(url, host) {
      host = host.toLowerCase();
      const rules = [${domains.map(d => `"${d.replace(/^\*\.?/, "")}"`).join(', ')}];
      for (let rule of rules) {
        if (host === rule || dnsDomainIs(host, "." + rule)) return "PROXY ${proxyServer}";
      }
      return "DIRECT";
    }
  `;

  try {
    // 🦊 FIREFOX
    if (typeof browser !== "undefined") {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const blob = new Blob([pacScript], { type: 'application/x-ns-proxy-autoconfig' });
      blobUrl = URL.createObjectURL(blob);
      
      await api.proxy.settings.set({
        value: {
          mode: "autoDetect",
          proxyType: "autoConfig",
          autoConfigUrl: blobUrl
        },
        scope: "regular"
      });
    } 
    // 🌐 CHROME
    else {
      await api.proxy.settings.set({
        value: {
          mode: "pac_script",
          pacScript: { data: pacScript }
        },
        scope: "regular"
      });
    }
    console.log("✅ Прокси применен");
  } catch (e) {
    console.error("❌ Ошибка прокси:", e);
  }
}

// 🚀 Инициализация
async function init() {
  const data = await api.storage.local.get(["proxyDomains", "proxyServer", "proxyEnabled"]);
  const enabled = data.proxyEnabled === true;
  
  updateIcon(enabled);
  await applyProxy(enabled, data.proxyDomains || [], data.proxyServer || DEFAULT_PROXY);
}

api.runtime.onInstalled.addListener(init);
api.runtime.onStartup.addListener(init);

api.storage.onChanged.addListener((changes) => {
  if (changes.proxyEnabled || changes.proxyDomains || changes.proxyServer) {
    init();
  }
});

// Запуск при загрузке скрипта
init();