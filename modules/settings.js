/* =============================================
   Module Name — Settings
   Manages API keys, display preferences, data,
   and sync configuration for the Tarot PWA.
   ============================================= */

const Settings = {
    // DOM Elements
    _container: null,

    /**
     * Render the settings view inside its container section
     */
    async render() {
        this._container = document.getElementById('viewSettings');
        if (!this._container) return;

        // Ensure App settings is loaded
        const settings = App.settings || await Store.getAllSettings();

        const html = `
            <div class="settings-header">
                <h2 class="section-title">${App.t('settings.title')}</h2>
            </div>
            
            <div class="settings-content">
                <!-- ==============================================
                     API KEYS
                     ============================================== -->
                <div class="card mb-xl">
                    <h3 class="section-subtitle">
                        <span class="icon">🔑</span> ${App.t('settings.apiKeys')}
                    </h3>
                    
                    <div class="form-group">
                        <label class="form-label" for="geminiApiKey">Google Gemini API Key (Primary AI)</label>
                        <div class="flex gap-sm">
                            <input type="password" id="geminiApiKey" class="form-input" 
                                value="${settings.geminiApiKey || ''}" placeholder="AIzaSy...">
                            <button class="btn btn-secondary btn-icon" id="btnTestGemini" title="Test Connection">✨</button>
                        </div>
                        <small class="text-muted text-xs mt-sm">Used for OCR, translation, card details (Free Tier)</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="openaiApiKey">OpenAI API Key (Fallback AI)</label>
                        <div class="flex gap-sm">
                            <input type="password" id="openaiApiKey" class="form-input" 
                                value="${settings.openaiApiKey || ''}" placeholder="sk-...">
                            <button class="btn btn-secondary btn-icon" id="btnTestOpenAI" title="Test Connection">🤖</button>
                        </div>
                    </div>

                    <div class="form-group mt-lg">
                        <label class="form-label">Cloudinary (Image Processing)</label>
                        <div class="grid-2 gap-sm">
                            <div>
                                <input type="text" id="cloudinaryName" class="form-input" 
                                    value="${settings.cloudinaryCloudName || ''}" placeholder="Cloud Name (e.g. dzq...)">
                            </div>
                            <div>
                                <input type="text" id="cloudinaryPreset" class="form-input" 
                                    value="${settings.cloudinaryUploadPreset || ''}" placeholder="Upload Preset">
                            </div>
                        </div>
                        <small class="text-muted text-xs mt-sm">Required for auto-cropping and image enhancement.</small>
                    </div>
                </div>

                <!-- ==============================================
                     DISPLAY & ANIMATIONS
                     ============================================== -->
                <div class="card mb-xl">
                    <h3 class="section-subtitle">
                        <span class="icon">🎨</span> ${App.t('settings.display')}
                    </h3>
                    
                    <div class="form-group">
                        <label class="form-label" for="settingLang">${App.t('settings.language')}</label>
                        <select id="settingLang" class="form-select">
                            <option value="vi" ${settings.language === 'vi' ? 'selected' : ''}>Tiếng Việt</option>
                            <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>

                    <div class="toggle-wrapper">
                        <div class="toggle-label">${App.t('settings.animations')}</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="settingAnim" ${settings.animationsEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="toggle-wrapper">
                        <div class="toggle-label">${App.t('settings.cardFlip')}</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="settingFlip" ${settings.cardFlipEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="toggle-wrapper">
                        <div class="toggle-label">
                            ${App.t('settings.reversed')}
                            <br><small class="text-xs text-muted">Allow reversed cards when drawing</small>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="settingReversed" ${settings.reversedCardsEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- ==============================================
                     CLOUD SYNC
                     ============================================== -->
                <div class="card mb-xl">
                    <h3 class="section-subtitle">
                        <span class="icon">☁️</span> ${App.t('settings.sync')}
                    </h3>
                    
                    <div class="form-group">
                        <label class="form-label">Cloud Provider</label>
                        <div class="category-tabs">
                            <button type="button" class="category-tab ${settings.cloudProvider === 'dropbox' ? 'active' : ''}" data-provider="dropbox">Dropbox</button>
                            <button type="button" class="category-tab ${settings.cloudProvider === 'gdrive' ? 'active' : ''}" data-provider="gdrive">Google Drive</button>
                            <button type="button" class="category-tab ${settings.cloudProvider === 'none' ? 'active' : ''}" data-provider="none">None (Local)</button>
                        </div>
                    </div>

                    <div id="dropboxConfig" class="form-group" style="display: ${settings.cloudProvider === 'dropbox' ? 'block' : 'none'}">
                        <label class="form-label" for="dropboxAppKey">Dropbox App Key (Client ID)</label>
                        <input type="text" id="dropboxAppKey" class="form-input mb-sm" 
                            value="${settings.dropboxAppKey || ''}" placeholder="Nhập App Key của Dropbox vào đây">
                        
                        ${settings.dropboxAccessToken ? `
                            <div class="badge badge-success p-sm mb-md flex align-center justify-between">
                                <span>Đã kết nối Dropbox ✓</span>
                                <button class="btn btn-sm text-danger" id="btnDisconnectDropbox" style="padding: 0; background:transparent;">Ngắt kết nối</button>
                            </div>
                            <div class="grid-2 gap-md">
                                <button class="btn btn-primary" id="btnDropboxBackup">Sao lưu lên đám mây</button>
                                <button class="btn btn-secondary" id="btnDropboxRestore">Khôi phục về máy</button>
                            </div>
                        ` : `
                            <button class="btn btn-secondary w-full" id="btnConnectDropbox">Đăng nhập Dropbox</button>
                        `}
                    </div>

                    <div id="gdriveConfig" class="form-group" style="display: ${settings.cloudProvider === 'gdrive' ? 'block' : 'none'}">
                        <label class="form-label" for="gdriveClientId">Google Client ID</label>
                        <input type="text" id="gdriveClientId" class="form-input mb-sm" 
                            value="${settings.gdriveClientId || ''}" placeholder="xxx.apps.googleusercontent.com">
                        <button class="btn btn-secondary w-full" id="btnConnectGDrive">Connect GDrive</button>
                    </div>

                    <div class="divider"></div>

                    <div class="toggle-wrapper">
                        <div class="toggle-label">Auto Sync background</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="settingAutoSync" ${settings.autoSync ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- ==============================================
                     DATA MANAGEMENT
                     ============================================== -->
                <div class="card mb-xl">
                    <h3 class="section-subtitle">
                        <span class="icon">💾</span> ${App.t('settings.data')}
                    </h3>
                    
                    <div class="grid-2 gap-md">
                        <button id="btnExport" class="btn btn-secondary">Export Data (JSON)</button>
                        <button id="btnImport" class="btn btn-secondary">Import Data</button>
                    </div>
                    
                    <button id="btnDownloadAll" class="btn btn-primary w-full mt-md flex justify-between">
                        <span>Download All Images (Offline Mode)</span>
                        <span>⬇️</span>
                    </button>
                    
                    <button id="btnClearData" class="btn btn-danger w-full mt-xl">Clear All Local Data</button>
                </div>
            </div>
        `;

        this._container.innerHTML = html;
        this._attachEvents();
    },

    /**
     * Attach all DOM events for the settings view
     */
    _attachEvents() {
        // --- API Keys (Auto-save on debounce) ---
        const bindInput = (id, keyName) => {
            const input = document.getElementById(id);
            if (!input) return;
            
            let timeout = null;
            input.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(async () => {
                    const val = input.value.trim();
                    App.settings[keyName] = val;
                    await Store.setSetting(keyName, val);
                }, DEBOUNCE_SAVE_MS);
            });
        };

        bindInput('geminiApiKey', 'geminiApiKey');
        bindInput('openaiApiKey', 'openaiApiKey');
        bindInput('cloudinaryName', 'cloudinaryCloudName');
        bindInput('cloudinaryPreset', 'cloudinaryUploadPreset');
        bindInput('dropboxAppKey', 'dropboxAppKey');
        bindInput('gdriveClientId', 'gdriveClientId');


        // --- Display Settings (Immediate save) ---
        const bindToggle = (id, keyName, allowRefresh = false) => {
            const toggle = document.getElementById(id);
            if (!toggle) return;
            
            toggle.addEventListener('change', async (e) => {
                const val = e.target.checked;
                App.settings[keyName] = val;
                await Store.setSetting(keyName, val);
                if (allowRefresh) this.render();
            });
        };

        const langSelect = document.getElementById('settingLang');
        if (langSelect) {
            langSelect.addEventListener('change', async (e) => {
                const val = e.target.value;
                App.settings.language = val;
                await Store.setSetting('language', val);
                App.refresh(); // Refresh app to apply language immediately
            });
        }

        bindToggle('settingAnim', 'animationsEnabled');
        bindToggle('settingFlip', 'cardFlipEnabled');
        bindToggle('settingReversed', 'reversedCardsEnabled');
        bindToggle('settingAutoSync', 'autoSync');


        // --- Sync Providers ---
        const providerTabs = document.querySelectorAll('.category-tab[data-provider]');
        providerTabs.forEach(tab => {
            tab.addEventListener('click', async (e) => {
                const provider = e.target.dataset.provider;
                
                // Update UI state
                providerTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                document.getElementById('dropboxConfig').style.display = provider === 'dropbox' ? 'block' : 'none';
                document.getElementById('gdriveConfig').style.display = provider === 'gdrive' ? 'block' : 'none';

                // Save
                App.settings.cloudProvider = provider;
                await Store.setSetting('cloudProvider', provider);
            });
        });


        // --- Actions ---
        
        // Dropbox Sync Action
        document.getElementById('btnConnectDropbox')?.addEventListener('click', () => {
            if (typeof CloudSync !== 'undefined') CloudSync.connectDropbox();
        });
        
        document.getElementById('btnDisconnectDropbox')?.addEventListener('click', async () => {
            App.settings.dropboxAccessToken = null;
            await Store.setSetting('dropboxAccessToken', null);
            Toast.success("Đã ngắt kết nối");
            this.render();
        });

        document.getElementById('btnDropboxBackup')?.addEventListener('click', () => {
            if (typeof CloudSync !== 'undefined') CloudSync.backupToDropbox();
        });

        document.getElementById('btnDropboxRestore')?.addEventListener('click', () => {
            if (typeof CloudSync !== 'undefined') CloudSync.restoreFromDropbox();
        });

        document.getElementById('btnTestGemini')?.addEventListener('click', () => {
            if (!App.settings.geminiApiKey) return Toast.warning("Please enter API Key first.");
            Toast.info("Testing Gemini Connection...");
            // TODO: Call AIService.testConnection() once module is built
        });

        document.getElementById('btnTestOpenAI')?.addEventListener('click', () => {
            if (!App.settings.openaiApiKey) return Toast.warning("Please enter API Key first.");
            Toast.info("Testing OpenAI Connection...");
        });

        document.getElementById('btnExport')?.addEventListener('click', async () => {
            try {
                Loading.show("Exporting data...");
                const data = await Store.exportAll(false); // don't include image Blobs for JSON
                const str = JSON.stringify(data, null, 2);
                
                const blob = new Blob([str], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `tarot-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                
                URL.revokeObjectURL(url);
                Toast.success("Export completed");
            } catch (err) {
                console.error(err);
                Toast.error("Export failed");
            } finally {
                Loading.hide();
            }
        });

        document.getElementById('btnClearData')?.addEventListener('click', async () => {
            const yes = await Modal.confirm(
                "Warning!", 
                "Are you sure you want to clear ALL local data? This action cannot be undone unless you have a backup."
            );
            if (!yes) return;

            try {
                Loading.show("Clearing database...");
                await Store.clear(STORES.DECKS);
                await Store.clear(STORES.CARDS);
                await Store.clear(STORES.SPREADS);
                await Store.clear(STORES.READINGS);
                await Store.clear(STORES.COMPANIONS);
                await Store.clear(STORES.SYNC_QUEUE);
                // Intentionally keeping SETTINGS
                
                Toast.success("Database cleared");
                App.refresh();
            } catch (err) {
                console.error(err);
                Toast.error("Failed to clear data");
            } finally {
                Loading.hide();
            }
        });
    }
};

// Make accessible to App controller
window.Settings = Settings;
