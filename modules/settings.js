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
                    
                    <div class="form-group mb-xl">
                        <label class="form-label text-warning" style="font-size: 1.1em;">🪐 Google Gemini (API Mặc định)</label>
                        <p class="text-sm text-muted mb-md">Tác vụ chính: Dịch nghĩa lá bài, Gợi ý danh sách, Đọc Companion Book, Giải mã Tarot.</p>
                        
                        <label class="form-label text-xs" for="geminiApiKey">API Key</label>
                        <input type="password" id="geminiApiKey" class="form-input mb-md" 
                            value="${settings.geminiApiKey || ''}" placeholder="AIzaSy...">

                        <label class="form-label text-xs" for="geminiModel">Model AI</label>
                        <div class="flex gap-sm mb-md">
                            <select id="geminiModel" class="form-select flex-1" style="font-family: monospace;">
                                <option value="">-- Nhập Key rồi bấm Tải danh sách --</option>
                            </select>
                            <button class="btn btn-secondary btn-sm" id="btnLoadModels" title="Tải danh sách model">🔄</button>
                        </div>
                        <p class="text-xs text-muted mb-md" id="geminiModelStatus">Model hiện tại: <strong>${settings.geminiModel || 'chưa chọn'}</strong></p>
                            
                        <div class="flex gap-sm">
                            <button class="btn btn-primary flex-1" id="btnSaveGemini">💾 Lưu Key</button>
                            <button class="btn btn-secondary flex-1" id="btnTestGemini">✨ Kiểm tra</button>
                        </div>
                    </div>

                    <div class="divider mb-xl"></div>

                    <div class="form-group mb-xl">
                        <label class="form-label text-info" style="font-size: 1.1em;">🤖 OpenAI / ChatGPT (Dự phòng)</label>
                        <p class="text-sm text-muted mb-md">AI thay thế khi Gemini lỗi, hoặc dùng GPT-4 để giải bài chi tiết hơn.</p>
                        
                        <label class="form-label text-xs" for="openaiApiKey">API Key</label>
                        <input type="password" id="openaiApiKey" class="form-input mb-md" 
                            value="${settings.openaiApiKey || ''}" placeholder="sk-...">
                            
                        <div class="flex gap-sm">
                            <button class="btn btn-primary flex-1" id="btnSaveOpenAI">💾 Lưu Key</button>
                            <button class="btn btn-secondary flex-1" id="btnTestOpenAI">🤖 Kiểm tra</button>
                        </div>
                    </div>

                    <div class="divider mb-xl"></div>

                    <div class="form-group mb-xl">
                        <label class="form-label" style="font-size: 1.1em;">☁️ Cloudinary (Xử lý hình ảnh)</label>
                        <p class="text-sm text-muted mb-md">Dùng để tự động crop, làm nét ảnh lá bài khi scan bằng camera. Miễn phí tại cloudinary.com.</p>
                        
                        <label class="form-label text-xs" for="cloudinaryName">Cloud Name</label>
                        <input type="text" id="cloudinaryName" class="form-input mb-md" 
                            value="${settings.cloudinaryCloudName || ''}" placeholder="VD: dxyz123abc">
                        
                        <label class="form-label text-xs" for="cloudinaryPreset">Upload Preset (Unsigned)</label>
                        <input type="text" id="cloudinaryPreset" class="form-input mb-md" 
                            value="${settings.cloudinaryUploadPreset || ''}" placeholder="VD: tarot_upload">
                            
                        <button class="btn btn-primary w-full" id="btnSaveCloudinary">💾 Lưu Cloudinary</button>
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

    _attachEvents() {
        // --- Generic auto-save for non-sensitive inputs ---
        const bindInput = (id, keyName) => {
            const input = document.getElementById(id);
            if (!input) return;
            const saveHandler = async () => {
                const val = input.value.trim();
                App.settings[keyName] = val;
                await Store.setSetting(keyName, val);
            };
            input.addEventListener('input', saveHandler);
            input.addEventListener('change', saveHandler);
        };

        // Only auto-save non-sensitive fields
        bindInput('cloudinaryName', 'cloudinaryCloudName');
        bindInput('cloudinaryPreset', 'cloudinaryUploadPreset');
        bindInput('dropboxAppKey', 'dropboxAppKey');
        bindInput('gdriveClientId', 'gdriveClientId');

        // --- Gemini: Save Key + Model ---
        document.getElementById('btnSaveGemini')?.addEventListener('click', async () => {
            const keyInput = document.getElementById('geminiApiKey');
            const modelSelect = document.getElementById('geminiModel');
            const key = keyInput?.value.trim();
            const model = modelSelect?.value;

            if (!key) return Toast.warning("Vui lòng nhập API Key.");

            App.settings.geminiApiKey = key;
            await Store.setSetting('geminiApiKey', key);

            if (model) {
                App.settings.geminiModel = model;
                await Store.setSetting('geminiModel', model);
                document.getElementById('geminiModelStatus').innerHTML = 
                    `Model hiện tại: <strong>${model}</strong>`;
            }

            Toast.success("Đã lưu Gemini API Key" + (model ? ` & model ${model}` : ""));
        });

        // --- Gemini: Load Models from Google ---
        document.getElementById('btnLoadModels')?.addEventListener('click', async () => {
            const keyInput = document.getElementById('geminiApiKey');
            const key = keyInput?.value.trim();
            if (!key) return Toast.warning("Vui lòng nhập API Key trước.");

            try {
                Loading.show("Đang tải danh sách model...");
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
                );
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error?.message || `HTTP ${res.status}`);
                }
                const data = await res.json();
                const models = (data.models || [])
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => ({
                        id: m.name.replace('models/', ''),
                        displayName: m.displayName || m.name.replace('models/', '')
                    }))
                    .sort((a, b) => a.id.localeCompare(b.id));

                const select = document.getElementById('geminiModel');
                select.innerHTML = '';
                
                if (models.length === 0) {
                    select.innerHTML = '<option value="">Không tìm thấy model nào</option>';
                    Toast.warning("API Key hợp lệ nhưng không có model khả dụng.");
                    return;
                }

                const currentModel = App.settings.geminiModel || '';
                models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = `${m.id} — ${m.displayName}`;
                    if (m.id === currentModel) opt.selected = true;
                    select.appendChild(opt);
                });

                // Auto-select first if none matched
                if (!currentModel || !models.find(m => m.id === currentModel)) {
                    // Try to find gemini-2.0-flash or first flash model
                    const preferred = models.find(m => m.id.includes('2.0-flash')) 
                        || models.find(m => m.id.includes('flash'))
                        || models[0];
                    if (preferred) select.value = preferred.id;
                }

                Toast.success(`Tìm thấy ${models.length} model khả dụng!`);
            } catch (err) {
                Toast.error("Lỗi tải model: " + err.message);
            } finally {
                Loading.hide();
            }
        });

        // --- Gemini: Test ---
        document.getElementById('btnTestGemini')?.addEventListener('click', async () => {
            const keyInput = document.getElementById('geminiApiKey');
            const modelSelect = document.getElementById('geminiModel');
            const key = keyInput?.value.trim();
            const model = modelSelect?.value;

            if (!key) return Toast.warning("Vui lòng nhập API Key trước.");
            if (!model) return Toast.warning("Vui lòng chọn Model trước (bấm 🔄 để tải danh sách).");

            try {
                Loading.show(`Đang kiểm tra ${model}...`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Respond with OK" }] }],
                        generationConfig: { temperature: 0, maxOutputTokens: 5 }
                    })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error?.message || `HTTP ${res.status}`);
                }

                const data = await res.json();
                if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    throw new Error("API trả về rỗng.");
                }

                Toast.success(`✅ Model ${model} hoạt động tốt!`);
            } catch (err) {
                Toast.error("Lỗi Gemini: " + err.message);
            } finally {
                Loading.hide();
            }
        });

        // --- OpenAI: Save Key ---
        document.getElementById('btnSaveOpenAI')?.addEventListener('click', async () => {
            const keyInput = document.getElementById('openaiApiKey');
            const key = keyInput?.value.trim();
            if (!key) return Toast.warning("Vui lòng nhập API Key.");

            App.settings.openaiApiKey = key;
            await Store.setSetting('openaiApiKey', key);
            Toast.success("Đã lưu OpenAI API Key!");
        });

        // --- OpenAI: Test ---
        document.getElementById('btnTestOpenAI')?.addEventListener('click', async () => {
            const keyInput = document.getElementById('openaiApiKey');
            const key = keyInput?.value.trim();
            if (!key) return Toast.warning("Vui lòng nhập API Key trước.");

            try {
                Loading.show("Đang kiểm tra OpenAI...");
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: 'Respond with OK' }],
                        max_tokens: 5
                    })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error?.message || `HTTP ${res.status}`);
                }

                Toast.success("✅ OpenAI hoạt động tốt!");
            } catch (err) {
                Toast.error("Lỗi OpenAI: " + err.message);
            } finally {
                Loading.hide();
            }
        });

        // --- Cloudinary: Save ---
        document.getElementById('btnSaveCloudinary')?.addEventListener('click', async () => {
            const name = document.getElementById('cloudinaryName')?.value.trim();
            const preset = document.getElementById('cloudinaryPreset')?.value.trim();

            App.settings.cloudinaryCloudName = name;
            App.settings.cloudinaryUploadPreset = preset;
            await Store.setSetting('cloudinaryCloudName', name);
            await Store.setSetting('cloudinaryUploadPreset', preset);

            Toast.success("Đã lưu cấu hình Cloudinary!");
        });

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
