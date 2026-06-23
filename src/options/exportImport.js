export function setupExportImport(state) {
    // ===== EXPORT =====
    document.getElementById('btn-export-settings').onclick = () => {
        const backupData = {
            version: "1.0",
            proxies: state.proxies,
            domains: state.domains,
            rules: state.rules,
            exceptions: state.exceptions,
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `proxy_router_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // ===== IMPORT =====
    const fileInput = document.getElementById('import-file-input');
    const triggerBtn = document.getElementById('btn-trigger-import');
    const importBtn = document.getElementById('btn-import-settings');
    const statusDiv = document.getElementById('import-file-status');

    triggerBtn.onclick = () => fileInput.click();

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            statusDiv.replaceChildren();
            statusDiv.appendChild(document.createTextNode(`Выбран файл: ${file.name}`));
            statusDiv.style.color = 'var(--text-main)';
            importBtn.style.display = 'inline-flex';
        } else {
            statusDiv.textContent = 'Файл не выбран';
            statusDiv.style.color = 'var(--text-muted)';
            importBtn.style.display = 'none';
        }
    };

    importBtn.onclick = () => {
        const file = fileInput.files[0];
        if (!file) return;

        if (!confirm('Вы уверены, что хотите ЗАМЕНИТЬ все текущие настройки данными из файла? Это действие нельзя отменить.')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);

                await state.replaceAll(importedData);
                document.getElementById('ex-domains').value = state.exceptions.join('\n');

                fileInput.value = '';
                importBtn.style.display = 'none';
                statusDiv.textContent = '✅ Настройки успешно импортированы!';
                statusDiv.style.color = 'var(--text-success)';

                alert('Настройки успешно восстановлены!');
            } catch (err) {
                alert('Ошибка при чтении файла: Убедитесь, что это корректный файл конфигурации JSON.');
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
}
