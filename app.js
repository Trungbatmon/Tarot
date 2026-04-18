/* =============================================
   Tarot PWA — Core Application
   Store (IndexedDB), App controller, i18n,
   Toast notifications, Modal system
   ============================================= */

// ==========================================
// Constants
// ==========================================
const DB_NAME = 'tarot_app_db';
const DB_VERSION = 1;
const TOAST_DURATION = 3000;
const DEBOUNCE_SAVE_MS = 500;

// IndexedDB Store Names
const STORES = {
    DECKS: 'decks',
    CARDS: 'cards',
    SPREADS: 'spreads',
    READINGS: 'readings',
    COMPANIONS: 'companions',
    SETTINGS: 'settings',
    SYNC_QUEUE: 'sync_queue'
};

// Default settings
const DEFAULT_SETTINGS = {
    language: 'vi',
    animationsEnabled: true,
    cardFlipEnabled: true,
    animationSpeed: 'normal', // fast, normal, slow
    reversedCardsEnabled: false,
    cloudProvider: 'dropbox', // dropbox, gdrive, none
    autoSync: false,
    geminiApiKey: '',
    openaiApiKey: '',
    cloudinaryCloudName: '',
    cloudinaryUploadPreset: '',
    dropboxAppKey: '',
    gdriveClientId: ''
};

// ==========================================
// i18n — Internationalization
// ==========================================
const I18N = {
    vi: {
        // Navigation
        'nav.decks': 'Bộ bài',
        'nav.draw': 'Rút bài',
        'nav.spreads': 'Trải bài',
        'nav.settings': 'Cài đặt',

        // Common
        'common.save': 'Lưu',
        'common.cancel': 'Hủy',
        'common.delete': 'Xóa',
        'common.edit': 'Sửa',
        'common.add': 'Thêm',
        'common.close': 'Đóng',
        'common.confirm': 'Xác nhận',
        'common.search': 'Tìm kiếm...',
        'common.loading': 'Đang tải...',
        'common.error': 'Đã xảy ra lỗi',
        'common.success': 'Thành công',
        'common.offline': 'Ngoại tuyến',
        'common.online': 'Trực tuyến',
        'common.syncing': 'Đang đồng bộ',

        // Decks
        'deck.title': 'Bộ bài',
        'deck.create': 'Tạo bộ bài mới',
        'deck.setDefault': 'Đặt làm mặc định',
        'deck.default': 'Mặc định',
        'deck.empty': 'Chưa có bộ bài nào',
        'deck.emptyDesc': 'Hãy tạo bộ bài đầu tiên để bắt đầu hành trình huyền bí.',
        'deck.category.tarot': 'Tarot',
        'deck.category.oracle': 'Oracle',
        'deck.category.lenormand': 'Lenormand',
        'deck.cardCount': '{count} lá bài',
        'deck.progress': 'Có ảnh: {done}/{total}',

        // Draw
        'draw.title': 'Rút bài',
        'draw.draw': 'Trải bài',
        'draw.redraw': 'Rút lại',
        'draw.flipAll': 'Lật tất cả',
        'draw.cardCount': 'Số lá rút',
        'draw.selectDeck': 'Chọn bộ bài',
        'draw.empty': 'Chưa sẵn sàng',
        'draw.emptyDesc': 'Hãy tạo và thêm ảnh cho bộ bài trước khi trải bài.',

        // Spreads
        'spread.title': 'Trải bài',
        'spread.create': 'Tạo trải bài mới',
        'spread.positions': '{count} vị trí',
        'spread.empty': 'Chưa có trải bài nào',
        'spread.emptyDesc': 'Tạo hoặc import một bố cục trải bài.',

        // Settings
        'settings.title': 'Cài đặt',
        'settings.apiKeys': 'API Keys',
        'settings.display': 'Hiển thị',
        'settings.data': 'Dữ liệu',
        'settings.sync': 'Đồng bộ',
        'settings.language': 'Ngôn ngữ',
        'settings.animations': 'Hiệu ứng chuyển động',
        'settings.cardFlip': 'Lật bài 3D',
        'settings.reversed': 'Cho phép lá bài ngược',
        'settings.animSpeed': 'Tốc độ hiệu ứng',

        // Toast messages
        'toast.saved': 'Đã lưu thành công',
        'toast.deleted': 'Đã xóa',
        'toast.error': 'Đã xảy ra lỗi',
        'toast.copied': 'Đã sao chép',
        'toast.noApiKey': 'Chưa cấu hình API Key. Vào Cài đặt để thêm.',
    },
    en: {
        'nav.decks': 'Decks',
        'nav.draw': 'Draw',
        'nav.spreads': 'Spreads',
        'nav.settings': 'Settings',

        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.add': 'Add',
        'common.close': 'Close',
        'common.confirm': 'Confirm',
        'common.search': 'Search...',
        'common.loading': 'Loading...',
        'common.error': 'An error occurred',
        'common.success': 'Success',
        'common.offline': 'Offline',
        'common.online': 'Online',
        'common.syncing': 'Syncing',

        'deck.title': 'Decks',
        'deck.create': 'Create New Deck',
        'deck.setDefault': 'Set as Default',
        'deck.default': 'Default',
        'deck.empty': 'No decks yet',
        'deck.emptyDesc': 'Create your first deck to begin the mystical journey.',
        'deck.category.tarot': 'Tarot',
        'deck.category.oracle': 'Oracle',
        'deck.category.lenormand': 'Lenormand',
        'deck.cardCount': '{count} cards',
        'deck.progress': 'Images: {done}/{total}',

        'draw.title': 'Draw Cards',
        'draw.draw': 'Draw',
        'draw.redraw': 'Redraw',
        'draw.flipAll': 'Flip All',
        'draw.cardCount': 'Cards to draw',
        'draw.selectDeck': 'Select deck',
        'draw.empty': 'Not ready yet',
        'draw.emptyDesc': 'Create a deck and add card images before reading.',

        'spread.title': 'Spreads',
        'spread.create': 'Create New Spread',
        'spread.positions': '{count} positions',
        'spread.empty': 'No spreads yet',
        'spread.emptyDesc': 'Create or import a spread layout.',

        'settings.title': 'Settings',
        'settings.apiKeys': 'API Keys',
        'settings.display': 'Display',
        'settings.data': 'Data',
        'settings.sync': 'Sync',
        'settings.language': 'Language',
        'settings.animations': 'Animations',
        'settings.cardFlip': '3D Card Flip',
        'settings.reversed': 'Allow Reversed Cards',
        'settings.animSpeed': 'Animation Speed',

        'toast.saved': 'Saved successfully',
        'toast.deleted': 'Deleted',
        'toast.error': 'An error occurred',
        'toast.copied': 'Copied',
        'toast.noApiKey': 'API Key not configured. Go to Settings to add it.',
    }
};

// ==========================================
// Store — IndexedDB Wrapper
// ==========================================
const Store = {
    db: null,
    _cache: {},

    /**
     * Initialize IndexedDB database
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains(STORES.DECKS)) {
                    const deckStore = db.createObjectStore(STORES.DECKS, { keyPath: 'id' });
                    deckStore.createIndex('category', 'category', { unique: false });
                    deckStore.createIndex('isDefault', 'isDefault', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.CARDS)) {
                    const cardStore = db.createObjectStore(STORES.CARDS, { keyPath: 'id' });
                    cardStore.createIndex('deckId', 'deckId', { unique: false });
                    cardStore.createIndex('arcana', 'arcana', { unique: false });
                    cardStore.createIndex('suit', 'suit', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.SPREADS)) {
                    const spreadStore = db.createObjectStore(STORES.SPREADS, { keyPath: 'id' });
                    spreadStore.createIndex('category', 'category', { unique: false });
                    spreadStore.createIndex('isPreset', 'isPreset', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.READINGS)) {
                    const readingStore = db.createObjectStore(STORES.READINGS, { keyPath: 'id' });
                    readingStore.createIndex('deckId', 'deckId', { unique: false });
                    readingStore.createIndex('spreadId', 'spreadId', { unique: false });
                    readingStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.COMPANIONS)) {
                    const compStore = db.createObjectStore(STORES.COMPANIONS, { keyPath: 'id' });
                    compStore.createIndex('deckId', 'deckId', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('synced', 'synced', { unique: false });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✦ IndexedDB initialized');
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('✗ IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    },

    /**
     * Get a single record by key
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all records from a store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Query records by index
     */
    async query(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Set (create or update) a record
     */
    async set(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete a record by key
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear all records in a store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Count records in a store (optionally by index)
     */
    async count(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            let request;
            if (indexName && value !== undefined) {
                request = store.index(indexName).count(value);
            } else {
                request = store.count();
            }
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // ==========================================
    // Settings helpers
    // ==========================================

    /**
     * Get a setting value with default fallback
     */
    async getSetting(key) {
        const record = await this.get(STORES.SETTINGS, key);
        if (record) return record.value;
        return DEFAULT_SETTINGS[key] !== undefined ? DEFAULT_SETTINGS[key] : null;
    },

    /**
     * Set a setting value
     */
    async setSetting(key, value) {
        return this.set(STORES.SETTINGS, { key, value });
    },

    /**
     * Get all settings as an object (merged with defaults)
     */
    async getAllSettings() {
        const records = await this.getAll(STORES.SETTINGS);
        const settings = { ...DEFAULT_SETTINGS };
        for (const record of records) {
            settings[record.key] = record.value;
        }
        return settings;
    },

    // ==========================================
    // Sync Queue helpers
    // ==========================================

    /**
     * Add a mutation to the sync queue
     */
    async addToSyncQueue(operation, storeName, recordId, data) {
        return this.set(STORES.SYNC_QUEUE, {
            operation,
            storeName,
            recordId,
            data,
            timestamp: Date.now(),
            synced: false
        });
    },

    /**
     * Get unsynced items from queue
     */
    async getUnsyncedQueue() {
        return this.query(STORES.SYNC_QUEUE, 'synced', false);
    },

    // ==========================================
    // Export / Import
    // ==========================================

    /**
     * Export all data as JSON (excluding image blobs by default)
     */
    async exportAll(includeImages = false) {
        const data = {};
        const storeNames = [
            STORES.DECKS, STORES.CARDS, STORES.SPREADS,
            STORES.READINGS, STORES.COMPANIONS
        ];

        for (const storeName of storeNames) {
            const records = await this.getAll(storeName);
            if (!includeImages) {
                data[storeName] = records.map(r => {
                    const cleaned = { ...r };
                    delete cleaned.image;
                    delete cleaned.backImage;
                    delete cleaned.thumbnail;
                    return cleaned;
                });
            } else {
                data[storeName] = records;
            }
        }

        data.exportedAt = new Date().toISOString();
        data.version = DB_VERSION;
        return data;
    },

    /**
     * Import data from exported JSON
     */
    async importAll(data) {
        const storeNames = [
            STORES.DECKS, STORES.CARDS, STORES.SPREADS,
            STORES.READINGS, STORES.COMPANIONS
        ];

        for (const storeName of storeNames) {
            if (data[storeName] && Array.isArray(data[storeName])) {
                for (const record of data[storeName]) {
                    await this.set(storeName, record);
                }
            }
        }
    }
};

// ==========================================
// UUID Generator
// ==========================================
function generateId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ==========================================
// Toast System
// ==========================================
const Toast = {
    /**
     * Show a toast notification
     * @param {string} message
     * @param {'info'|'success'|'warning'|'error'} type
     * @param {number} duration - ms
     */
    show(message, type = 'info', duration = TOAST_DURATION) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            info: '✦',
            success: '✓',
            warning: '⚠',
            error: '✗'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '✦'}</span>
            <span class="toast-message">${this._sanitize(message)}</span>
        `;

        container.appendChild(toast);

        // Auto remove after animation
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, duration + 400); // extra time for fadeout animation
    },

    info(message) { this.show(message, 'info'); },
    success(message) { this.show(message, 'success'); },
    warning(message) { this.show(message, 'warning'); },
    error(message) { this.show(message, 'error'); },

    _sanitize(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ==========================================
// Modal System
// ==========================================
const Modal = {
    _overlay: null,
    _container: null,
    _titleEl: null,
    _bodyEl: null,
    _footerEl: null,
    _closeBtn: null,
    _onClose: null,

    init() {
        this._overlay = document.getElementById('modalOverlay');
        this._container = document.getElementById('modalContainer');
        this._titleEl = document.getElementById('modalTitle');
        this._bodyEl = document.getElementById('modalBody');
        this._footerEl = document.getElementById('modalFooter');
        this._closeBtn = document.getElementById('modalClose');

        // Close handlers
        this._closeBtn.addEventListener('click', () => this.close());
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) this.close();
        });
    },

    /**
     * Open modal with content
     * @param {Object} options - { title, body (HTML string), footer (HTML string), onClose }
     */
    open({ title = '', body = '', footer = '', onClose = null, bodyClass = '' }) {
        this._titleEl.textContent = title;
        this._bodyEl.innerHTML = body;
        this._footerEl.innerHTML = footer;
        this._onClose = onClose;

        // Apply optional body class
        this._bodyEl.className = 'modal-body' + (bodyClass ? ` ${bodyClass}` : '');

        this._overlay.classList.add('visible');
        this._overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close modal
     */
    close() {
        this._overlay.classList.remove('visible');
        this._overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        if (typeof this._onClose === 'function') {
            this._onClose();
        }

        // Clear content after transition
        setTimeout(() => {
            this._titleEl.textContent = '';
            this._bodyEl.innerHTML = '';
            this._footerEl.innerHTML = '';
            this._bodyEl.className = 'modal-body';
        }, 350);
    },

    isOpen() {
        return this._overlay && this._overlay.classList.contains('visible');
    },

    /**
     * Show a confirm dialog
     * @returns {Promise<boolean>}
     */
    confirm(title, message) {
        return new Promise((resolve) => {
            const bodyHtml = `<p style="font-family: var(--font-body); font-size: var(--text-md); color: var(--text-secondary);">${message}</p>`;
            const footerHtml = `
                <button id="confirmCancel" class="btn btn-secondary">${App.t('common.cancel')}</button>
                <button id="confirmOk" class="btn btn-primary">${App.t('common.confirm')}</button>
            `;

            this.open({
                title,
                body: bodyHtml,
                footer: footerHtml,
                onClose: () => resolve(false)
            });

            document.getElementById('confirmCancel').addEventListener('click', () => {
                this.close();
                resolve(false);
            });
            document.getElementById('confirmOk').addEventListener('click', () => {
                this.close();
                resolve(true);
            });
        });
    }
};

// ==========================================
// Loading Overlay
// ==========================================
const Loading = {
    _overlay: null,
    _text: null,

    init() {
        this._overlay = document.getElementById('loadingOverlay');
        this._text = document.getElementById('loadingText');
    },

    show(text = '') {
        if (text) this._text.textContent = text;
        this._overlay.classList.add('visible');
        this._overlay.setAttribute('aria-hidden', 'false');
    },

    hide() {
        this._overlay.classList.remove('visible');
        this._overlay.setAttribute('aria-hidden', 'true');
    },

    update(text) {
        if (this._text) this._text.textContent = text;
    }
};

// ==========================================
// App Controller
// ==========================================
const App = {
    currentView: 'decks',
    settings: { ...DEFAULT_SETTINGS },

    /**
     * Initialize application
     */
    async init() {
        try {
            // Init IndexedDB
            await Store.init();

            // Load settings
            this.settings = await Store.getAllSettings();

            // Init UI components
            Modal.init();
            Loading.init();

            // Init Cloud Sync hook for OAuth callbacks
            if (typeof CloudSync !== 'undefined') {
                await CloudSync.init();
            }

            // Setup navigation
            this._setupNavigation();

            // Setup online/offline detection
            this._setupConnectivity();

            // Navigate to initial view
            this.navigateTo('decks');

            // Render initial empty states for all views
            this._renderInitialViews();

            console.log('✦ Tarot PWA initialized');
        } catch (error) {
            console.error('✗ App init failed:', error);
            Toast.error('Không thể khởi tạo ứng dụng');
        }
    },

    /**
     * Translate a key
     * @param {string} key - dot notation key
     * @param {Object} params - replacement params like {count: 5}
     * @returns {string}
     */
    t(key, params = {}) {
        const lang = this.settings.language || 'vi';
        let text = (I18N[lang] && I18N[lang][key]) || (I18N['vi'] && I18N['vi'][key]) || key;

        // Replace {param} placeholders
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    },

    /**
     * Navigate to a view
     */
    navigateTo(viewName) {
        // Update sections visibility
        const sections = document.querySelectorAll('.view-section');
        sections.forEach(s => s.classList.remove('active'));

        const targetSection = document.querySelector(`[data-view="${viewName}"]`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update nav tabs
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(t => t.classList.remove('active'));

        const activeTab = document.querySelector(`.nav-tab[data-view="${viewName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.currentView = viewName;

        // Trigger module render if available
        this._renderView(viewName);
    },

    /**
     * Setup bottom navigation
     */
    _setupNavigation() {
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                if (view) this.navigateTo(view);
            });
        });
    },

    /**
     * Setup online/offline detection
     */
    _setupConnectivity() {
        const updateStatus = () => {
            const dot = document.querySelector('.sync-dot');
            const label = document.querySelector('.sync-label');
            if (!dot || !label) return;

            if (navigator.onLine) {
                dot.className = 'sync-dot online';
                label.textContent = this.t('common.online');
            } else {
                dot.className = 'sync-dot offline';
                label.textContent = this.t('common.offline');
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
    },

    /**
     * Render a view (calls module's render method if available)
     */
    _renderView(viewName) {
        switch (viewName) {
            case 'decks':
                if (typeof DeckManager !== 'undefined') DeckManager.render();
                break;
            case 'draw':
                if (typeof CardReader !== 'undefined') CardReader.render();
                break;
            case 'spreads':
                if (window.SpreadBuilder) window.SpreadBuilder.render();
                break;
            case 'history':
                if (window.ReadingHistory) window.ReadingHistory.render();
                break;
            case 'settings':
                if (typeof Settings !== 'undefined') Settings.render();
                break;
        }
    },

    /**
     * Render initial placeholder views with empty states
     */
    _renderInitialViews() {
        const emptyViews = {
            decks: {
                icon: '🃏',
                title: this.t('deck.empty'),
                desc: this.t('deck.emptyDesc'),
                cta: this.t('deck.create'),
                ctaId: 'ctaCreateDeck'
            },
            draw: {
                icon: '🔮',
                title: this.t('draw.empty'),
                desc: this.t('draw.emptyDesc'),
                cta: null
            },
            spreads: {
                icon: '📐',
                title: this.t('spread.empty'),
                desc: this.t('spread.emptyDesc'),
                cta: this.t('spread.create'),
                ctaId: 'ctaCreateSpread'
            },
            settings: {
                icon: '⚙️',
                title: this.t('settings.title'),
                desc: '',
                cta: null
            }
        };

        for (const [view, info] of Object.entries(emptyViews)) {
            const section = document.querySelector(`[data-view="${view}"]`);
            if (!section) continue;

            // Only render placeholder if module hasn't rendered yet
            if (section.children.length === 0) {
                const ctaHtml = info.cta
                    ? `<button id="${info.ctaId}" class="btn btn-primary mt-lg">${info.cta}</button>`
                    : '';

                section.innerHTML = `
                    <h2 class="section-title">${info.title || ''}</h2>
                    <div class="empty-state">
                        <span class="empty-state-icon">${info.icon}</span>
                        <h3 class="empty-state-title">${info.title}</h3>
                        ${info.desc ? `<p class="empty-state-desc">${info.desc}</p>` : ''}
                        ${ctaHtml}
                    </div>
                `;
            }
        }
    },

    /**
     * Refresh current view
     */
    refresh() {
        this._renderView(this.currentView);
    },

    /**
     * Check if animations are enabled
     */
    get animationsEnabled() {
        return this.settings.animationsEnabled &&
               !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    /**
     * Check if card flip animation is enabled
     */
    get cardFlipEnabled() {
        return this.settings.cardFlipEnabled && this.animationsEnabled;
    },

    /**
     * Check if reversed cards are enabled
     */
    get reversedEnabled() {
        return this.settings.reversedCardsEnabled;
    }
};

// ==========================================
// Initialize on DOM Ready
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
