/* =============================================
   Module Name — Reading History
   Displays past readings (Journal) and allows
   adding notes or deleting readings.
   ============================================= */

const ReadingHistory = {
    _container: null,
    _state: {
        currentView: 'list', // list, detail
        readings: [],
        decksMap: {},
        spreadsMap: {},
        selectedReading: null
    },

    async render() {
        this._container = document.getElementById('viewHistory');
        if (!this._container) return;
        
        await this._loadData();
        this._renderMainView();
    },

    async _loadData() {
        Loading.show("Đang nạp nhật ký...");
        try {
            // Load base stores
            const decks = await Store.getAll(STORES.DECKS);
            const spreads = await Store.getAll(STORES.SPREADS);
            const readings = await Store.getAll(STORES.READINGS);

            this._state.decksMap = decks.reduce((acc, d) => ({ ...acc, [d.id]: d }), {});
            this._state.spreadsMap = spreads.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
            
            // Sort history desc
            this._state.readings = readings.sort((a, b) => b.createdAt - a.createdAt);
        } catch (e) {
            console.error(e);
            Toast.error("Lỗi khi tải nhật ký trải bài");
        } finally {
            Loading.hide();
        }
    },

    _renderMainView() {
        if (this._state.currentView === 'list') {
            this._renderListView();
        } else if (this._state.currentView === 'detail') {
            this._renderDetailView();
        }
    },

    // ==========================================
    // LIST VIEW
    // ==========================================
    _renderListView() {
        if (this._state.readings.length === 0) {
            this._container.innerHTML = `
                <div class="empty-state mt-xl">
                    <span class="empty-state-icon">📖</span>
                    <h3 class="empty-state-title">Nhật ký trống</h3>
                    <p class="empty-state-desc">Bạn chưa thực hiện và lưu bất kỳ trải bài nào. Hãy qua tab "Draw" để bắt đầu.</p>
                </div>
            `;
            return;
        }

        let listHtml = '';
        
        // Group by Date logically (optional, but let's keep it simple flat list first for stability)
        this._state.readings.forEach(reading => {
            const date = new Date(reading.createdAt);
            const dateStr = date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            const deckName = this._state.decksMap[reading.deckId]?.name || 'Bộ bài đã xóa';
            const spreadName = this._state.spreadsMap[reading.spreadId]?.name || 'Tự do';
            const cardCount = reading.cards ? reading.cards.length : 0;

            listHtml += `
                <div class="card mb-md p-md hover-scale cursor-pointer btn-open-reading" data-id="${reading.id}">
                    <div class="flex justify-between items-start mb-sm">
                        <div>
                            <h4 class="text-gold font-bold mb-xs" style="font-size: 1.1rem;">${this._sanitize(spreadName)}</h4>
                            <div class="text-xs text-muted">${this._sanitize(deckName)} • ${cardCount} lá</div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs font-bold" style="color: var(--primary);">${timeStr}</div>
                            <div class="text-xs text-muted">${dateStr}</div>
                        </div>
                    </div>
                    ${reading.notes ? `<div class="text-sm italic mt-sm line-clamp-2" style="color: #a0a0b0; border-left: 2px solid var(--primary); padding-left: 8px;">"${this._sanitize(reading.notes)}"</div>` : ''}
                </div>
            `;
        });

        const html = `
            <div class="text-center mb-lg">
                <h2 class="section-title mb-xs">Nhật Ký Tâm Linh</h2>
                <p class="text-muted text-sm">Nơi lưu giữ các trải bài và chiêm nghiệm của bạn.</p>
            </div>
            
            <div class="reading-history-list">
                ${listHtml}
            </div>
        `;

        this._container.innerHTML = html;

        // Attach events
        document.querySelectorAll('.btn-open-reading').forEach(el => {
            el.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this._state.selectedReading = this._state.readings.find(r => r.id === id);
                if (this._state.selectedReading) {
                    this._state.currentView = 'detail';
                    this._renderMainView();
                }
            });
        });
    },

    // ==========================================
    // DETAIL VIEW
    // ==========================================
    async _renderDetailView() {
        const r = this._state.selectedReading;
        const deck = this._state.decksMap[r.deckId];
        const spread = this._state.spreadsMap[r.spreadId];
        
        const dateStr = new Date(r.createdAt).toLocaleString('vi-VN');

        const html = `
            <div class="flex items-center justify-between mb-lg">
                <div class="flex items-center gap-sm cursor-pointer text-muted" id="btnBackFromDetail">
                    <span class="text-lg">←</span> <span>Nhật ký</span>
                </div>
                <button class="btn btn-sm btn-danger btn-icon" id="btnDeleteReading" title="Xóa trải bài này">🗑️</button>
            </div>

            <div class="text-center mb-xl">
                <h2 class="section-title mb-xs">${this._sanitize(spread?.name || 'Trải bài')}</h2>
                <p class="text-gold text-sm font-bold mb-xs">${dateStr}</p>
                <p class="text-muted text-xs">Sử dụng: ${this._sanitize(deck?.name || 'N/A')}</p>
            </div>

            <div id="readingCardsGrid" class="mb-xl text-center">
                <div class="text-muted text-sm italic">Đang nạp dữ liệu lá bài...</div>
            </div>

            <div class="card">
                <div class="flex justify-between items-center mb-sm">
                    <h3 class="section-subtitle mb-0">Ghi chú & Chiêm nghiệm</h3>
                    <button class="btn btn-sm btn-secondary" id="btnEditNotes">Lưu ghi chú</button>
                </div>
                <textarea id="readingNotesText" class="form-textarea" style="min-height: 120px;" placeholder="Ghi lại những suy nghĩ, cảm xúc hay trực giác của bạn sau khi đọc trải bài này...">${this._sanitize(r.notes || '')}</textarea>
            </div>
        `;

        this._container.innerHTML = html;
        this._attachDetailEvents();
        await this._renderCardsGrid();
    },

    async _renderCardsGrid() {
        const gridContainer = document.getElementById('readingCardsGrid');
        if (!gridContainer) return;

        const r = this._state.selectedReading;
        const spread = this._state.spreadsMap[r.spreadId];
        
        let cardsHtml = '';
        let missingCards = false;

        // Layout calc
        let gridClass = 'grid-auto';
        if (r.cards.length === 1) gridClass = 'flex justify-center';
        else if (r.cards.length === 2) gridClass = 'grid-2';
        else if (r.cards.length === 3) gridClass = 'grid-3';

        // Wait to load actual card data to render images
        for (const item of r.cards) {
            const cardObj = await Store.get(STORES.CARDS, item.cardId);
            if (!cardObj) {
                missingCards = true; 
                continue;
            }

            const posName = spread?.positions?.find(p => p.id === item.positionId)?.name || 'Vị trí';
            
            const imgUrl = cardObj.image ? URL.createObjectURL(cardObj.image) : null;
            const style = imgUrl ? `background-image: url('${imgUrl}'); background-size: cover;` : '';
            const revCss = item.reversed ? 'transform: rotateZ(180deg);' : '';

            cardsHtml += `
                <div class="tarot-card-scene" style="margin: 0 auto; width: 100px; height: 160px; cursor: pointer;" onclick="Toast.info('Xem chi tiết sẽ mở trong Card Reader')">
                    <div class="text-gold text-xs font-bold mb-xs tracking-wider line-clamp-1" style="font-size: 10px;">${this._sanitize(posName)}</div>
                    <div class="tarot-card no-animation is-flipped" style="width: 100%; height: 100%;">
                        <div class="tarot-card-face tarot-card-front" style="${style} ${revCss}">
                            <!-- placeholder if no image -->
                        </div>
                    </div>
                    <div class="text-xs mt-xs line-clamp-1 text-muted" style="font-size: 10px;">${this._sanitize(cardObj.nameVi || cardObj.name)} ${item.reversed ? '(Ng)' : ''}</div>
                </div>
            `;
        }

        if (missingCards) {
            Toast.error("Vài lá bài trong trải bài này không còn tồn tại do bộ bài đã bị xóa/thay đổi.");
        }

        gridContainer.innerHTML = `<div class="${gridClass} gap-md">${cardsHtml}</div>`;
    },

    _attachDetailEvents() {
        document.getElementById('btnBackFromDetail')?.addEventListener('click', () => {
            this._state.currentView = 'list';
            this._renderMainView();
        });

        document.getElementById('btnEditNotes')?.addEventListener('click', async () => {
            const notes = document.getElementById('readingNotesText').value.trim();
            const r = this._state.selectedReading;
            
            try {
                Loading.show("Đang lưu...");
                r.notes = notes;
                await Store.set(STORES.READINGS, r);
                await Store.addToSyncQueue('update', STORES.READINGS, r.id, r);
                Toast.success("Đã ghi chú");
            } catch (e) {
                console.error(e);
                Toast.error("Lỗi khi lưu");
            } finally {
                Loading.hide();
            }
        });

        document.getElementById('btnDeleteReading')?.addEventListener('click', async () => {
            const yes = await Modal.confirm("Xóa Nhật ký", "Bạn chắc chắn muốn xóa bản ghi này? Hành động này không thể hoàn tác.");
            if (yes) {
               try {
                   Loading.show("Đang xóa...");
                   await Store.delete(STORES.READINGS, this._state.selectedReading.id);
                   Toast.success("Đã xóa vĩnh viễn");
                   
                   // Reload list
                   await this._loadData();
                   this._state.currentView = 'list';
                   this._renderMainView();
               } catch (e) {
                   Toast.error("Lỗi khi xóa");
               } finally {
                   Loading.hide();
               }
            }
        });
    },

    _sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

window.ReadingHistory = ReadingHistory;
