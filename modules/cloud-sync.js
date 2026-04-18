/* =============================================
   Module Name — Cloud Sync
   Handles Dropbox OAuth Implicit flow and JSON
   Upload/Download for reliable backup.
   ============================================= */

const CloudSync = {
    // Dropbox API Endpoints
    AUTH_URL: 'https://www.dropbox.com/oauth2/authorize',
    UPLOAD_URL: 'https://content.dropboxapi.com/2/files/upload',
    DOWNLOAD_URL: 'https://content.dropboxapi.com/2/files/download',

    /**
     * Called on App Init to catch callback
     */
    async init() {
        // Check for Dropbox access token in URL hash
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            if (token) {
                // Save token
                App.settings.dropboxAccessToken = token;
                await Store.setSetting('dropboxAccessToken', token);
                
                // Remove hash from URL to keep it clean
                history.replaceState(null, '', window.location.pathname + window.location.search);
                
                Toast.success("Kết nối Dropbox thành công!");
                
                // Update UI state if Settings is open
                if (App.currentView === 'settings') {
                    if (typeof Settings !== 'undefined') Settings.render();
                }
            }
        }
        
        // Setup manual sync trigger if AutoSync is on? 
        // For simplicity, we just provide manual backup/restore functions to the user right now.
        this._attachToSettings();
    },

    /**
     * Start OAuth Flow
     */
    connectDropbox() {
        const appKey = App.settings.dropboxAppKey;
        if (!appKey) {
            return Toast.error("Vui lòng nhập Dropbox App Key trước.");
        }

        // Normalize path to prevent index.html mismatch in PWA
        let currentPath = window.location.pathname;
        if (currentPath.endsWith('/index.html')) {
            currentPath = currentPath.substring(0, currentPath.length - 'index.html'.length);
        }
        if (!currentPath.endsWith('/')) {
            currentPath += '/';
        }

        const redirectUri = window.location.origin + currentPath;
        const authUrl = `${this.AUTH_URL}?client_id=${appKey}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;
        
        // Redirect
        window.location.href = authUrl;
    },

    /**
     * Convert Blob/File to Base64
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            if (!blob) return resolve(null);
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    /**
     * Convert Base64 back to File
     */
    _base64ToFile(base64, filename) {
        if (!base64) return null;
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    },

    /**
     * Build export JSON WITH Base64 images
     */
    async _buildFullBackup() {
        Loading.show("Đang chuẩn bị dữ liệu (có thể tốn thời gian)...");
        try {
            const data = await Store.exportAll(true);
            
            // Process Cards: convert images
            if (data.cards) {
                for (const card of data.cards) {
                    if (card.image && card.image instanceof Blob) {
                        card._imageBase64 = await this._blobToBase64(card.image);
                        delete card.image; // remove raw blob before stringify
                    }
                }
            }
            
            // Process Decks: convert images
            if (data.decks) {
                for (const deck of data.decks) {
                    if (deck.backImage && deck.backImage instanceof Blob) {
                        deck._backImageBase64 = await this._blobToBase64(deck.backImage);
                        delete deck.backImage;
                    }
                }
            }

            return JSON.stringify(data);
        } finally {
            Loading.hide();
        }
    },

    /**
     * Restore from full backup string
     */
    async _restoreFullBackup(jsonString) {
        Loading.show("Đang khôi phục dữ liệu...");
        try {
            const data = JSON.parse(jsonString);
            
            // Convert images back
            if (data.cards) {
                for (const card of data.cards) {
                    if (card._imageBase64) {
                        card.image = this._base64ToFile(card._imageBase64, 'card_img.webp');
                        delete card._imageBase64;
                    }
                }
            }
            if (data.decks) {
                for (const deck of data.decks) {
                    if (deck._backImageBase64) {
                        deck.backImage = this._base64ToFile(deck._backImageBase64, 'back_img.webp');
                        delete deck._backImageBase64;
                    }
                }
            }

            await Store.importAll(data);
            Toast.success("Khôi phục hoàn tất!");
            App.refresh(); // Refresh app immediately
        } finally {
            Loading.hide();
        }
    },

    /**
     * Upload full backup to Dropbox
     */
    async backupToDropbox() {
        const token = App.settings.dropboxAccessToken;
        if (!token) return Toast.error("Chưa kết nối Dropbox.");

        try {
            const jsonText = await this._buildFullBackup();
            const fileBlob = new Blob([jsonText], { type: 'application/json' });

            Loading.show("Đang Tải lên Dropbox...");

            const response = await fetch(this.UPLOAD_URL, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: '/tarot_backup.json',
                        mode: 'overwrite',
                        autorename: false,
                        mute: true
                    }),
                    'Content-Type': 'application/octet-stream' // Required by Dropbox
                },
                body: fileBlob
            });

            if (!response.ok) {
                const errResult = await response.text();
                throw new Error("HTTP Error: " + response.status + ' - ' + errResult);
            }

            Toast.success("Sao lưu lên Dropbox thành công!");
        } catch (e) {
            console.error("Dropbox Upload Error:", e);
            Toast.error("Lỗi sao lưu Dropbox: " + e.message);
        } finally {
            Loading.hide();
        }
    },

    /**
     * Download backup from Dropbox
     */
    async restoreFromDropbox() {
        const token = App.settings.dropboxAccessToken;
        if (!token) return Toast.error("Chưa kết nối Dropbox.");

        try {
            const yes = await Modal.confirm("Khôi phục Đám mây", "Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại của bạn. Bạn chắc chắn chứ?");
            if (!yes) return;

            Loading.show("Đang kéo dữ liệu từ Dropbox...");

            const response = await fetch(this.DOWNLOAD_URL, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: '/tarot_backup.json'
                    })
                }
            });

            if (!response.ok) {
                const errResult = await response.text();
                if (response.status === 409) {
                     throw new Error("Không tìm thấy file backup trên Dropbox.");
                }
                throw new Error("HTTP Error: " + response.status + ' ' + errResult);
            }

            const jsonText = await response.text();
            await this._restoreFullBackup(jsonText);

        } catch (e) {
            console.error("Dropbox Download Error:", e);
            Toast.error("Lỗi Khôi phục: " + e.message);
        } finally {
            Loading.hide();
        }
    },

    /**
     * Internal binding specifically helping the Settings module
     */
    _attachToSettings() {
        // We observe dom changes or just bind on interval if settings opened?
        // Actually, better to expose global triggers that Settings can attach to.
        // Wait, since we are doing offline-first, Settings view is entirely dynamic.
        // We will just let settings.js call these directly.
    }
};

window.CloudSync = CloudSync;
