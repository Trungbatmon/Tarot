/* =============================================
   Module Name — Cloud Sync
   Handles Dropbox OAuth PKCE flow and JSON
   Upload/Download for reliable backup.
   ============================================= */

const CloudSync = {
    // Dropbox API Endpoints
    AUTH_URL: 'https://www.dropbox.com/oauth2/authorize',
    TOKEN_URL: 'https://api.dropboxapi.com/oauth2/token',
    UPLOAD_URL: 'https://content.dropboxapi.com/2/files/upload',
    DOWNLOAD_URL: 'https://content.dropboxapi.com/2/files/download',

    /**
     * Called on App Init to catch callback
     */
    async init() {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const legacyToken = hashParams.get('access_token');

        if (code) {
            const verifier = sessionStorage.getItem('dropbox_code_verifier');
            if (verifier) await this._exchangeCodeForToken(code, verifier);
            history.replaceState(null, '', window.location.pathname);
        } else if (legacyToken) {
            App.settings.dropboxAccessToken = legacyToken;
            await Store.setSetting('dropboxAccessToken', legacyToken);
            history.replaceState(null, '', window.location.pathname);
            Toast.success("Kết nối Dropbox thành công (Cơ bản)!");
            if (App.currentView === 'settings' && typeof Settings !== 'undefined') Settings.render();
        }
        
        this._attachToSettings();
    },

    async _exchangeCodeForToken(code, verifier) {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: App.settings.dropboxAppKey,
            code_verifier: verifier,
            redirect_uri: this._getRedirectUri()
        });

        try {
            Loading.show("Đang xác thực bảo mật...");
            const res = await fetch(this.TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });
            if (res.ok) {
                const data = await res.json();
                App.settings.dropboxAccessToken = data.access_token;
                await Store.setSetting('dropboxAccessToken', data.access_token);
                if (data.refresh_token) {
                    App.settings.dropboxRefreshToken = data.refresh_token;
                    await Store.setSetting('dropboxRefreshToken', data.refresh_token);
                }
                Toast.success("Kết nối Dropbox thành công!");
                if (App.currentView === 'settings' && typeof Settings !== 'undefined') Settings.render();
            } else {
                const err = await res.text();
                console.error("Code exchange failed:", err);
                Toast.error("Kết nối thất bại. Vui lòng thử lại.");
            }
        } catch(e) {
            console.error(e);
            Toast.error("Lỗi mạng khi kết nối Dropbox.");
        } finally {
            sessionStorage.removeItem('dropbox_code_verifier');
            Loading.hide();
        }
    },

    async _refreshAccessToken() {
        const refreshToken = App.settings.dropboxRefreshToken;
        if (!refreshToken) return null;

        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: App.settings.dropboxAppKey
        });

        try {
            const res = await fetch(this.TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body
            });
            if (res.ok) {
                const data = await res.json();
                if (data.access_token) {
                    App.settings.dropboxAccessToken = data.access_token;
                    await Store.setSetting('dropboxAccessToken', data.access_token);
                    return data.access_token;
                }
            }
        } catch(e) {
            console.error(e);
        }
        return null;
    },

    async _getValidToken() {
        // We just return the active token, and rely on downstream API 401 checking to trigger refresh
        // This is simpler and avoids making pre-flight token requests
        return App.settings.dropboxAccessToken;
    },

    _getRedirectUri() {
        let currentPath = window.location.pathname;
        if (currentPath.endsWith('/index.html')) {
            currentPath = currentPath.substring(0, currentPath.length - 'index.html'.length);
        }
        if (!currentPath.endsWith('/')) currentPath += '/';
        return window.location.origin + currentPath;
    },

    _base64UrlEncode(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    },

    /**
     * Start OAuth Flow (PKCE)
     */
    async connectDropbox() {
        const appKey = App.settings.dropboxAppKey;
        if (!appKey) {
            return Toast.error("Vui lòng nhập Dropbox App Key trước.");
        }

        // Generate PKCE verifier and challenge
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const codeVerifier = this._base64UrlEncode(array);
        sessionStorage.setItem('dropbox_code_verifier', codeVerifier);

        const data = new TextEncoder().encode(codeVerifier);
        const hashed = await crypto.subtle.digest('SHA-256', data);
        const codeChallenge = this._base64UrlEncode(hashed);

        const authUrl = `${this.AUTH_URL}?client_id=${appKey}&response_type=code&token_access_type=offline&code_challenge_method=S256&code_challenge=${codeChallenge}&redirect_uri=${encodeURIComponent(this._getRedirectUri())}`;
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
        let token = await this._getValidToken();
        if (!token) return Toast.error("Chưa kết nối Dropbox.");

        try {
            const jsonText = await this._buildFullBackup();
            const fileBlob = new Blob([jsonText], { type: 'application/json' });

            Loading.show("Đang Tải lên Dropbox...");

            let response = await fetch(this.UPLOAD_URL, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: '/tarot_backup.json',
                        mode: 'overwrite',
                        autorename: false,
                        mute: true
                    }),
                    'Content-Type': 'application/octet-stream'
                },
                body: fileBlob
            });

            // Handle expiry auto-refresh
            if (response.status === 401) {
                const newToken = await this._refreshAccessToken();
                if (newToken) {
                    token = newToken;
                    response = await fetch(this.UPLOAD_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Dropbox-API-Arg': JSON.stringify({
                                path: '/tarot_backup.json',
                                mode: 'overwrite',
                                autorename: false,
                                mute: true
                            }),
                            'Content-Type': 'application/octet-stream'
                        },
                        body: fileBlob
                    });
                } else {
                    App.settings.dropboxAccessToken = null;
                    await Store.setSetting('dropboxAccessToken', null);
                    if (App.currentView === 'settings' && typeof Settings !== 'undefined') Settings.render();
                    throw new Error("Phiên đăng nhập hết hạn. Vui lòng kết nối lại.");
                }
            }

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
        let token = await this._getValidToken();
        if (!token) return Toast.error("Chưa kết nối Dropbox.");

        try {
            const yes = await Modal.confirm("Khôi phục Đám mây", "Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại của bạn. Bạn chắc chắn chứ?");
            if (!yes) return;

            Loading.show("Đang kéo dữ liệu từ Dropbox...");

            let response = await fetch(this.DOWNLOAD_URL, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: '/tarot_backup.json'
                    })
                }
            });

            // Handle expiry auto-refresh
            if (response.status === 401) {
                const newToken = await this._refreshAccessToken();
                if (newToken) {
                    token = newToken;
                    response = await fetch(this.DOWNLOAD_URL, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Dropbox-API-Arg': JSON.stringify({
                                path: '/tarot_backup.json'
                            })
                        }
                    });
                } else {
                    App.settings.dropboxAccessToken = null;
                    await Store.setSetting('dropboxAccessToken', null);
                    if (App.currentView === 'settings' && typeof Settings !== 'undefined') Settings.render();
                    throw new Error("Phiên đăng nhập hết hạn. Vui lòng kết nối lại.");
                }
            }

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
