/* =============================================
   Module Name — Deck Manager
   Handles CRUD operations for Decks (Tarot/Oracle/Lenormand)
   and their associated Cards.
   ============================================= */

const DeckManager = {
    _container: null,
    _state: {
        activeCategory: 'tarot', // tarot, oracle, lenormand
        decks: [],
        currentView: 'list', // list, detail, create, edit-card
        selectedDeckId: null,
        cards: []
    },

    /**
     * Entry point to render the module
     */
    async render() {
        this._container = document.getElementById('viewDecks');
        if (!this._container) return;
        
        await this._loadData();
        this._renderMainView();
    },

    /**
     * Load initial decks data
     */
    async _loadData() {
        this._state.decks = await Store.getAll(STORES.DECKS);
    },

    /**
     * Ensure at least one deck is marked as default
     */
    async _ensureDefaultDeck() {
        if (this._state.decks.length === 0) return;
        
        const hasDefault = this._state.decks.some(d => d.isDefault);
        if (!hasDefault) {
            const firstDeck = this._state.decks[0];
            firstDeck.isDefault = true;
            await Store.set(STORES.DECKS, firstDeck);
        }
    },

    /**
     * Main Router for Deck Module
     */
    _renderMainView() {
        switch (this._state.currentView) {
            case 'list':
                this._renderListView();
                break;
            case 'create':
                this._renderCreateForm();
                break;
            case 'detail':
                this._renderDeckDetail();
                break;
            case 'edit-card':
                this._renderCardEditor();
                break;
        }
    },

    // ==========================================
    // DECK LIST VIEW
    // ==========================================

    _renderListView() {
        const { activeCategory, decks } = this._state;
        const filteredDecks = decks.filter(d => d.category === activeCategory);

        let decksHtml = '';

        if (filteredDecks.length === 0) {
            decksHtml = `
                <div class="empty-state">
                    <span class="empty-state-icon">🃏</span>
                    <h3 class="empty-state-title">${App.t('deck.empty')}</h3>
                    <p class="empty-state-desc">${App.t('deck.emptyDesc')}</p>
                </div>
            `;
        } else {
            decksHtml = `<div class="grid-2 gap-lg mt-lg">`;
            filteredDecks.forEach(deck => {
                const backImgUrl = deck.backImage ? URL.createObjectURL(deck.backImage) : null;
                const style = backImgUrl ? `background-image: url('${backImgUrl}'); background-size: cover;` : '';
                
                decksHtml += `
                    <div class="card deck-card relative" data-id="${deck.id}">
                        ${deck.isDefault ? `<span class="badge badge-default absolute top-2 right-2 z-10" style="position:absolute; top:8px; right:8px; z-index:10;">${App.t('deck.default')}</span>` : ''}
                        
                        <div class="tarot-card-scene" style="margin-bottom: var(--space-md);">
                            <div class="tarot-card no-animation">
                                <div class="tarot-card-face tarot-card-back" style="${style}">
                                    ${!backImgUrl ? '<div class="card-back-placeholder">🔮</div>' : ''}
                                </div>
                            </div>
                        </div>
                        
                        <h4 class="text-md font-bold mb-xs" style="color: var(--text-primary); text-align: center;">
                            ${this._sanitize(deck.name)}
                        </h4>
                        
                        <div class="text-xs text-muted text-center mb-md">
                            ${deck.cardCount ? `${deck.cardCount} cards` : '...'}
                        </div>
                        
                        <div class="flex gap-sm">
                            <button class="btn btn-secondary btn-sm w-full btn-open-deck" data-id="${deck.id}">Mở</button>
                            <button class="btn btn-icon btn-secondary btn-deck-menu" data-id="${deck.id}" style="width: 34px; height: 34px;">⋮</button>
                        </div>
                    </div>
                `;
            });
            decksHtml += `</div>`;
        }

        const html = `
            <div class="flex justify-between items-center mb-xl">
                <h2 class="section-title mb-0" style="margin-bottom: 0;">${App.t('deck.title')}</h2>
                <button id="btnCreateDeckList" class="btn btn-primary btn-sm">+ ${App.t('common.add')}</button>
            </div>

            <div class="category-tabs">
                <button type="button" class="category-tab ${activeCategory === 'tarot' ? 'active' : ''}" data-cat="tarot">
                    🔮 Tarot
                </button>
                <button type="button" class="category-tab ${activeCategory === 'oracle' ? 'active' : ''}" data-cat="oracle">
                    ✨ Oracle
                </button>
                <button type="button" class="category-tab ${activeCategory === 'lenormand' ? 'active' : ''}" data-cat="lenormand">
                    🌸 Lenormand
                </button>
            </div>

            ${decksHtml}
        `;

        this._container.innerHTML = html;
        this._attachListEvents();
    },

    /**
     * Show Context Menu for Deck
     */
    _showDeckMenu(deckId) {
        const deck = this._state.decks.find(d => d.id === deckId);
        if (!deck) return;

        const bodyHtml = `
            <div class="flex flex-col gap-md">
                ${!deck.isDefault ? `<button class="btn btn-secondary w-full" id="menuSetDefault">📌 Đặt làm mặc định</button>` : ''}
                <button class="btn btn-danger w-full" id="menuDeleteDeck">🗑️ Xóa bộ bài</button>
            </div>
        `;

        Modal.open({
            title: `Tùy chọn: ${this._sanitize(deck.name)}`,
            body: bodyHtml
        });

        setTimeout(() => {
            document.getElementById('menuSetDefault')?.addEventListener('click', async () => {
                Modal.close();
                await this._setDefaultDeck(deckId);
            });
            
            document.getElementById('menuDeleteDeck')?.addEventListener('click', async () => {
                Modal.close();
                const yes = await Modal.confirm("Xóa bộ bài", `Bạn có chắc muốn xóa bộ bài "${this._sanitize(deck.name)}" và tất cả lá bài bên trong? Hành động này không thể hoàn tác.`);
                if (yes) {
                    await this._deleteDeck(deckId);
                }
            });
        }, 100);
    },

    async _setDefaultDeck(deckId) {
        // Reset old default
        for (const deck of this._state.decks) {
            if (deck.isDefault) {
                deck.isDefault = false;
                await Store.set(STORES.DECKS, deck);
            }
        }
        // Set new default
        const newDefault = this._state.decks.find(d => d.id === deckId);
        if (newDefault) {
            newDefault.isDefault = true;
            await Store.set(STORES.DECKS, newDefault);
            Toast.success(`PWA đã đặt mặc định: ${newDefault.name}`);
        }
        this._renderListView();
    },

    async _deleteDeck(deckId) {
        Loading.show("Đang xóa...");
        try {
            await Store.delete(STORES.DECKS, deckId);
            // Must also delete all cards in this deck
            const cards = await Store.query(STORES.CARDS, 'deckId', deckId);
            for (const card of cards) {
                await Store.delete(STORES.CARDS, card.id);
            }
            // Remove from local state
            this._state.decks = this._state.decks.filter(d => d.id !== deckId);
            await this._ensureDefaultDeck();
            
            Toast.success("Đã xóa bộ bài");
            this._renderListView();
        } catch (e) {
            console.error(e);
            Toast.error("Lỗi khi xóa bộ bài");
        } finally {
            Loading.hide();
        }
    },

    _attachListEvents() {
        // Tab switching
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this._state.activeCategory = e.target.dataset.cat;
                this._renderListView();
            });
        });

        // Create
        document.getElementById('btnCreateDeckList')?.addEventListener('click', () => {
            this._state.currentView = 'create';
            this._renderMainView();
        });

        // Open Deck
        document.querySelectorAll('.btn-open-deck').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-open-deck').dataset.id;
                this._state.selectedDeckId = id;
                this._state.currentView = 'detail';
                this._renderMainView();
            });
        });

        // Deck Menu
        document.querySelectorAll('.btn-deck-menu').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.btn-deck-menu').dataset.id;
                this._showDeckMenu(id);
            });
        });
    },

    // ==========================================
    // CREATE DECK VIEW
    // ==========================================

    _renderCreateForm() {
        const catLabel = {
            'tarot': 'Tarot',
            'oracle': 'Oracle',
            'lenormand': 'Lenormand'
        }[this._state.activeCategory];

        const html = `
            <div class="flex items-center gap-sm mb-lg cursor-pointer text-muted" id="btnBackFromCreate">
                <span class="text-lg">←</span> <span>Quay lại</span>
            </div>

            <h2 class="section-title">${App.t('deck.create')} (${catLabel})</h2>

            <div class="card mb-xl">
                <div class="form-group">
                    <label class="form-label" for="deckName">Tên bộ bài <span class="text-danger">*</span></label>
                    <input type="text" id="deckName" class="form-input" placeholder="VD: Rider Waite Smith" required>
                </div>

                <div class="form-group mb-0">
                    <label class="form-label" for="deckDesc">Mô tả (Không bắt buộc)</label>
                    <textarea id="deckDesc" class="form-textarea" placeholder="Mô tả về phong cách, tác giả..."></textarea>
                </div>
            </div>

            <div class="card mb-xl">
                <h3 class="section-subtitle mb-sm">✨ Danh sách lá bài</h3>
                <p class="text-sm text-muted mb-md">
                    ${this._state.activeCategory === 'tarot' ? 
                        `Nhập tên bộ bài (VD: "Standard" để lấy 78 lá chuẩn) hoặc tên cụ thể để AI tự động tìm các lá bài đặc biệt (nếu có).` : 
                    this._state.activeCategory === 'lenormand' ? 
                        `App sẽ tự động áp dụng cấu trúc 36 lá chuẩn cho Lenormand.` :
                        `Hãy dùng AI để tự động tạo khung danh sách bài hoặc tạo số lượng thủ công bên dưới.`}
                </p>

                <div class="flex flex-col gap-md">
                    ${!AIService.isGeminiAvailable() && this._state.activeCategory !== 'lenormand' ? 
                        `<div class="badge badge-warning text-sm p-sm mb-sm block">⚠️ Bạn chưa nhập Gemini API Key trong phần Cài đặt. Nhập "Standard" cho bộ Tarot mặc định, hoặc tự tạo list thủ công.</div>` 
                    : ''}
                    
                    <button id="btnAiSuggest" class="btn btn-primary w-full">
                        <span class="icon">✨</span> Tự động tạo bằng AI
                    </button>
                    
                    <div class="divider-label">HOẶC</div>

                    <div class="flex gap-sm">
                        <input type="number" id="manualCardCount" class="form-input" placeholder="Số lượng lá" min="1" max="150" value="${this._state.activeCategory === 'tarot' ? '78' : '36'}">
                        <button id="btnManualCreate" class="btn btn-secondary whitespace-nowrap">Tạo thủ công</button>
                    </div>
                </div>
            </div>

            <!-- Pre-verification container for generated cards before saving -->
            <div id="cardPreviewContainer" class="hidden mb-xl">
                <h3 class="section-subtitle">Kết quả tạo: <span id="previewCount">0</span> lá</h3>
                <div id="previewList" class="bg-black bg-opacity-20 rounded p-md max-h-60 overflow-y-auto mt-sm border border-gray-800 text-sm">
                    <!-- Dynamic preview list -->
                </div>
                <button id="btnConfirmAndSaveDeck" class="btn btn-success w-full mt-md bg-green-600 text-white">Xác nhận & Lưu bộ bài</button>
            </div>
        `;

        this._container.innerHTML = html;
        this._attachCreateEvents();
    },

    _attachCreateEvents() {
        let currentSuggestedCards = null;

        document.getElementById('btnBackFromCreate')?.addEventListener('click', () => {
            this._state.currentView = 'list';
            this._renderMainView();
        });

        const showPreview = (cards) => {
            currentSuggestedCards = cards;
            const container = document.getElementById('cardPreviewContainer');
            const count = document.getElementById('previewCount');
            const list = document.getElementById('previewList');
            
            container.classList.remove('hidden');
            count.textContent = cards.length;
            
            let listHtml = '';
            cards.forEach((c, i) => {
                const sub = c.arcana || c.suit ? ` <span class="text-muted text-xs">(${[c.arcana, c.suit].filter(Boolean).join(' - ')})</span>` : '';
                listHtml += `<div class="mb-xs truncate"><span class="text-gold mr-xs">${i+1}.</span> ${this._sanitize(c.name)}${sub}</div>`;
            });
            list.innerHTML = listHtml;
            
            // Auto scroll to bottom
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        };

        // AI Generation
        document.getElementById('btnAiSuggest')?.addEventListener('click', async () => {
            const nameInput = document.getElementById('deckName');
            const name = nameInput.value.trim();
            
            if (!name && this._state.activeCategory !== 'lenormand' && name.toLowerCase() !== 'standard') {
                Toast.error("Vui lòng nhập Tên bộ bài để AI có thể tìm thông tin!");
                nameInput.focus();
                return;
            }

            try {
                Loading.show("AI đang tìm dữ liệu...");
                const cards = await AIService.suggestDeckCards(name || 'Standard', this._state.activeCategory);
                showPreview(cards);
                Toast.success(`Tạo thành công ${cards.length} lá bài.`);
            } catch (error) {
                console.error(error);
                Toast.error(error.message);
            } finally {
                Loading.hide();
            }
        });

        // Manual Generation
        document.getElementById('btnManualCreate')?.addEventListener('click', () => {
            const count = parseInt(document.getElementById('manualCardCount').value) || 0;
            if (count < 1 || count > 200) {
                return Toast.error("Số lượng không hợp lệ (1-200)");
            }

            const cards = [];
            for(let i = 0; i < count; i++) {
                cards.push({
                    name: `Card ${i + 1}`,
                    suit: null,
                    arcana: null
                });
            }
            showPreview(cards);
        });

        // Final Save Process
        document.getElementById('btnConfirmAndSaveDeck')?.addEventListener('click', async () => {
            const name = document.getElementById('deckName').value.trim();
            const desc = document.getElementById('deckDesc').value.trim();

            if (!name) return Toast.error("Tên bộ bài không được để trống");
            if (!currentSuggestedCards || currentSuggestedCards.length === 0) return Toast.error("Chưa có danh sách lá bài");

            try {
                Loading.show("Đang lưu...");
                
                // 1. Create Deck Record
                const deckId = generateId();
                const isFirstDeck = this._state.decks.length === 0;

                const newDeck = {
                    id: deckId,
                    name,
                    description: desc,
                    category: this._state.activeCategory,
                    cardCount: currentSuggestedCards.length,
                    backImage: null,
                    backImageUrl: null,
                    isDefault: isFirstDeck,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                await Store.set(STORES.DECKS, newDeck);
                await Store.addToSyncQueue('create', STORES.DECKS, deckId, newDeck);

                // 2. Create Card Records
                for (let i = 0; i < currentSuggestedCards.length; i++) {
                    const sc = currentSuggestedCards[i];
                    const cardData = {
                        id: generateId(),
                        deckId: deckId,
                        name: sc.name,
                        nameVi: '',
                        number: i + 1,
                        suit: sc.suit || null,
                        arcana: sc.arcana || null,
                        image: null,
                        imageUrl: null,
                        imageDownloaded: false,
                        keywords: [],
                        keywordsVi: [],
                        details: '',
                        detailsVi: '',
                        reversedDetails: '',
                        reversedDetailsVi: '',
                        companionText: '',
                        companionTextVi: '',
                        sortOrder: i
                    };
                    await Store.set(STORES.CARDS, cardData);
                    await Store.addToSyncQueue('create', STORES.CARDS, cardData.id, cardData);
                }

                Toast.success("Đã tạo bộ bài thành công!");
                
                // Switch back to list and refresh
                this._state.selectedDeckId = deckId;
                this._state.currentView = 'detail';
                await this._loadData();
                this._renderMainView();

            } catch (error) {
                console.error(error);
                Toast.error("Lỗi khi lưu bộ bài: " + error.message);
            } finally {
                Loading.hide();
            }
        });
    },

    // ==========================================
    // DECK DETAIL VIEW
    // ==========================================

    async _renderDeckDetail() {
        const deckId = this._state.selectedDeckId;
        const deck = this._state.decks.find(d => d.id === deckId);
        
        if (!deck) {
            this._state.currentView = 'list';
            return this._renderMainView();
        }

        Loading.show("Đang tải thẻ bài...");
        
        try {
            // Load cards for this deck
            let cards = await Store.query(STORES.CARDS, 'deckId', deckId);
            // Sort by order manually (array sort)
            cards = cards.sort((a,b) => a.sortOrder - b.sortOrder);
            this._state.cards = cards;
            
            // Calculate progress (how many cards have images)
            const cardsWithImages = cards.filter(c => c.image || c.imageUrl).length;
            const progressPct = cards.length > 0 ? (cardsWithImages / cards.length) * 100 : 0;

            const backImgUrl = deck.backImage ? URL.createObjectURL(deck.backImage) : null;
            const backStyle = backImgUrl ? `background-image: url('${backImgUrl}'); background-size: cover;` : '';

            // Render Cards Grid
            let cardsHtml = '<div class="grid-auto gap-md">';
            cards.forEach(card => {
                const frotImgUrl = card.image ? URL.createObjectURL(card.image) : null;
                const frontStyle = frotImgUrl ? `background-image: url('${frotImgUrl}'); background-size: cover;` : '';
                
                cardsHtml += `
                    <div class="tarot-card-scene" data-cardid="${card.id}" style="cursor:pointer;" class="btn-edit-card">
                        <div class="tarot-card no-animation">
                            <div class="tarot-card-face tarot-card-front" style="${frontStyle}">
                                ${!frotImgUrl ? `<div class="card-back-placeholder"><span style="font-size: 0.5em">${card.number}</span></div>` : ''}
                                <div class="tarot-card-name truncate" style="padding:4px 8px;">${this._sanitize(card.name)}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            cardsHtml += '</div>';

            const html = `
                <div class="flex items-center justify-between mb-lg">
                    <div class="flex items-center gap-sm cursor-pointer text-muted" id="btnBackFromDetail">
                        <span class="text-lg">←</span> <span>Quay lại</span>
                    </div>
                    <span class="badge ${deck.isDefault ? 'badge-default' : 'badge-gold'}">${deck.category.toUpperCase()}</span>
                </div>

                <div class="card mb-xl p-md">
                    <div class="flex gap-lg items-center">
                        <!-- Deck Cover (Back Image) -->
                        <div class="tarot-card-scene flex-shrink-0" style="width: 80px;">
                            <div class="tarot-card no-animation">
                                <div class="tarot-card-face tarot-card-back" style="${backStyle}">
                                    ${!backImgUrl ? '<div class="card-back-placeholder text-sm">Back</div>' : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex-1">
                            <h2 class="text-xl font-display text-gold mb-xs">${this._sanitize(deck.name)}</h2>
                            ${deck.description ? `<p class="text-sm text-muted mb-sm truncate">${this._sanitize(deck.description)}</p>` : ''}
                            
                            <div class="text-xs text-muted mb-xs">
                                Tiến độ hình ảnh: ${cardsWithImages}/${cards.length}
                            </div>
                            <div class="progress-bar mb-sm">
                                <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
                            </div>
                            
                            <div class="flex gap-sm mt-md flex-wrap">
                                <button class="btn btn-secondary btn-sm relative" id="btnImportBackImage">
                                    Import Mặt Sau
                                    <input type="file" id="backImageFileInput" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                                </button>
                                <button class="btn btn-primary btn-sm" id="btnImportCompanionDetail">Import Sách Hướng Dẫn</button>
                                <button class="btn btn-secondary btn-sm" id="btnAutoFetchImages" title="Tự động tải hình từ web">🌐 Tải hình tự động</button>
                                <button class="btn btn-secondary btn-icon" title="Scan từng lá qua Camera" id="btnBatchScan">📷</button>
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="section-subtitle flex justify-between items-center bg-black bg-opacity-30 p-sm rounded sticky top-14 z-10">
                    <span>Lá Bài (${cards.length})</span>
                    <button class="btn btn-icon btn-secondary" style="width:30px;height:30px;" title="Thêm lá bài trống" id="btnAddSingleCard">+</button>
                </h3>
                
                ${cardsHtml}
            `;

            this._container.innerHTML = html;
            
            document.getElementById('btnBackFromDetail')?.addEventListener('click', () => {
                this._state.currentView = 'list';
                this._renderMainView();
            });

            document.getElementById('btnImportCompanionDetail')?.addEventListener('click', () => {
                if (typeof CompanionImporter !== 'undefined') {
                    CompanionImporter.openForDeck(deckId);
                } else {
                    Toast.error("Companion Importer module is missing.");
                }
            });

            // --- Import Back Image ---
            document.getElementById('backImageFileInput')?.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                try {
                    Loading.show("Đang lưu mặt sau...");
                    deck.backImage = file;
                    deck.updatedAt = Date.now();
                    await Store.set(STORES.DECKS, deck);
                    await Store.addToSyncQueue('update', STORES.DECKS, deck.id, deck);
                    
                    // Refresh local state
                    const idx = this._state.decks.findIndex(d => d.id === deck.id);
                    if (idx >= 0) this._state.decks[idx] = deck;
                    
                    Toast.success("Đã import mặt sau thành công!");
                    this._renderDeckDetail();
                } catch (err) {
                    console.error(err);
                    Toast.error("Lỗi lưu mặt sau: " + err.message);
                } finally {
                    Loading.hide();
                }
            });

            // --- Auto Fetch Images from Web (Public domain RWS) ---
            document.getElementById('btnAutoFetchImages')?.addEventListener('click', async () => {
                // Map common Tarot card names to their Wikipedia/public domain image filenames
                const cardsWithoutImages = cards.filter(c => !c.image && !c.imageUrl);
                
                if (cardsWithoutImages.length === 0) {
                    return Toast.info("Tất cả lá bài đều đã có hình ảnh rồi!");
                }

                const confirmed = confirm(
                    `Sẽ thử tải hình cho ${cardsWithoutImages.length} lá bài chưa có ảnh từ nguồn công khai.\n\n` +
                    `Lưu ý: Chỉ hoạt động tốt nhất với bộ Rider-Waite-Smith (bản quyền công khai).\n\n` +
                    `Ngoài ra cũng sẽ tìm trên các nguồn khác nếu có. Tiếp tục?`
                );
                if (!confirmed) return;

                let successCount = 0;
                let failCount = 0;

                Loading.show(`Đang tải hình... (0/${cardsWithoutImages.length})`);

                for (let i = 0; i < cardsWithoutImages.length; i++) {
                    const card = cardsWithoutImages[i];
                    Loading.show(`Đang tải hình ${i + 1}/${cardsWithoutImages.length}: ${card.name}`);

                    try {
                        // Normalize card name for URL
                        const slug = card.name
                            .replace(/^(\d+)\s*[-–]\s*/, '') // Remove number prefix like "1 - "
                            .replace(/\s+/g, '_')
                            .replace(/['']/g, "'");

                        // Try multiple public sources
                        const sources = [
                            // Wikimedia Commons - Rider-Waite-Smith (public domain since 2012)
                            `https://upload.wikimedia.org/wikipedia/commons/thumb/${this._getWikiPath(card.name)}`,
                            // Sacred Texts archive
                            `https://www.sacred-texts.com/tarot/pkt/img/${this._getSacredTextPath(card.name)}`
                        ];

                        let fetched = false;
                        for (const imgUrl of sources) {
                            if (!imgUrl) continue;
                            try {
                                const res = await fetch(imgUrl, { mode: 'cors' });
                                if (res.ok) {
                                    const blob = await res.blob();
                                    if (blob.size > 1000) { // Sanity check: not an error page
                                        card.image = new File([blob], `${slug}.jpg`, { type: blob.type });
                                        card.imageUrl = imgUrl;
                                        card.imageDownloaded = true;
                                        await Store.set(STORES.CARDS, card);
                                        successCount++;
                                        fetched = true;
                                        break;
                                    }
                                }
                            } catch (fetchErr) {
                                // silently continue to next source
                            }
                        }
                        if (!fetched) failCount++;
                    } catch (err) {
                        failCount++;
                    }
                }

                Loading.hide();
                Toast.success(`Hoàn tất! ✅ ${successCount} thành công, ❌ ${failCount} không tìm thấy.`);
                this._renderDeckDetail(); // Refresh view
            });

            // --- Batch Scan via Camera ---
            document.getElementById('btnBatchScan')?.addEventListener('click', () => {
                const cardsWithoutImages = cards.filter(c => !c.image && !c.imageUrl);
                if (cardsWithoutImages.length === 0) {
                    return Toast.info("Tất cả lá bài đều đã có hình rồi!");
                }

                // Open scanner for the first card without image
                const firstCard = cardsWithoutImages[0];
                Toast.info(`Bắt đầu scan từ lá: ${firstCard.name} (${cardsWithoutImages.length} lá còn thiếu)`);
                
                if (typeof CardScanner !== 'undefined') {
                    CardScanner.openForCard(firstCard.id, () => {
                        this._renderDeckDetail(); // Refresh to show new image
                    });
                } else {
                    Toast.error("Module Card Scanner chưa được tải.");
                }
            });

            // --- Add Single Card ---
            document.getElementById('btnAddSingleCard')?.addEventListener('click', async () => {
                const name = prompt("Nhập tên lá bài mới:");
                if (!name || !name.trim()) return;

                try {
                    Loading.show("Đang thêm...");
                    const newCard = {
                        id: generateId(),
                        deckId: deckId,
                        name: name.trim(),
                        nameVi: '',
                        number: cards.length + 1,
                        suit: null,
                        arcana: null,
                        image: null,
                        imageUrl: null,
                        imageDownloaded: false,
                        keywords: [],
                        details: '',
                        reversedDetails: '',
                        companionText: '',
                        sortOrder: cards.length
                    };
                    await Store.set(STORES.CARDS, newCard);
                    
                    // Update deck card count
                    deck.cardCount = (deck.cardCount || 0) + 1;
                    deck.updatedAt = Date.now();
                    await Store.set(STORES.DECKS, deck);

                    Toast.success(`Đã thêm lá "${name.trim()}"`);
                    this._renderDeckDetail();
                } catch (err) {
                    console.error(err);
                    Toast.error("Lỗi thêm lá bài: " + err.message);
                } finally {
                    Loading.hide();
                }
            });

            // Card Click Events to open Editor
            document.querySelectorAll('.tarot-card-scene[data-cardid]').forEach(el => {
                el.addEventListener('click', (e) => {
                    this._state.currentView = 'edit-card';
                    this._state.editingCardId = e.currentTarget.dataset.cardid;
                    this._renderMainView();
                });
            });

        } catch(e) {
            console.error(e);
            Toast.error("Failed to load cards");
        } finally {
            Loading.hide();
        }
    },

    // ==========================================
    // CARD DETAIL EDITOR VIEW
    // ==========================================

    async _renderCardEditor() {
        const cardId = this._state.editingCardId;
        const card = await Store.get(STORES.CARDS, cardId);
        if (!card) {
            this._state.currentView = 'detail';
            return this._renderMainView();
        }

        const frontImgUrl = card.image ? URL.createObjectURL(card.image) : null;
        const frontStyle = frontImgUrl ? `background-image: url('${frontImgUrl}'); background-size: cover;` : '';

        const html = `
            <div class="flex items-center justify-between mb-lg">
                <div class="flex items-center gap-sm cursor-pointer text-muted" id="btnBackFromEditor">
                    <span class="text-lg">←</span> <span>Chi tiết bộ bài</span>
                </div>
            </div>

            <h2 class="section-title text-center mb-0">${this._sanitize(card.name)}</h2>
            ${card.arcana || card.suit ? `<p class="text-center text-muted text-sm mb-lg">${[card.arcana, card.suit].filter(Boolean).join(' - ')}</p>` : ''}

            <!-- Card Image Box -->
            <div class="flex justify-center mb-xl relative">
                <div class="tarot-card-scene" style="width: 140px; cursor:pointer;" id="btnOpenScanner">
                    <div class="tarot-card no-animation">
                        <div class="tarot-card-face tarot-card-front" style="${frontStyle}">
                            ${!frontImgUrl ? `<div class="card-back-placeholder"><span style="font-size: 0.5em">${card.number}</span></div>` : ''}
                        </div>
                    </div>
                </div>
                <!-- Mini camera icon overlay -->
                <button class="btn btn-icon btn-primary absolute" style="bottom: -15px; width:40px; height:40px; border:2px solid var(--bg-primary);" id="btnOpenScannerMini">📷</button>
            </div>

            <div class="card mb-xl">
                <h3 class="section-subtitle">Thông tin lá bài</h3>
                <div class="form-group">
                    <label class="form-label" for="cardNameVi">Tên tiếng Việt</label>
                    <input type="text" id="cardNameVi" class="form-input" value="${this._sanitize(card.nameVi || '')}" placeholder="VD: Kẻ Khờ">
                </div>
                
                <div class="form-group mb-0">
                    <label class="form-label" for="cardKeywords">Từ khóa (Keywords)</label>
                    <input type="text" id="cardKeywords" class="form-input" value="${this._sanitize((card.keywords || []).join(', '))}" placeholder="Phân cách bằng dấu phẩy...">
                </div>
            </div>

            <div class="card mb-xl">
                <h3 class="section-subtitle">Ý nghĩa (Interpretation)</h3>
                
                <div class="form-group">
                    <label class="form-label" for="cardDetails">Giải nghĩa bài xuôi (Upright)</label>
                    <textarea id="cardDetails" class="form-textarea" style="min-height:120px;" placeholder="Gõ ý nghĩa bài xuôi...">${this._sanitize(card.details || '')}</textarea>
                </div>
                
                <div class="form-group mb-0">
                    <label class="form-label" for="cardRevDetails">Giải nghĩa bài ngược (Reversed)</label>
                    <textarea id="cardRevDetails" class="form-textarea" placeholder="Gõ ý nghĩa bài ngược...">${this._sanitize(card.reversedDetails || '')}</textarea>
                </div>
            </div>

            <button id="btnSaveCard" class="btn btn-success w-full mb-md">Lưu Chi Tiết Lá Bài</button>
            <button id="btnAiAutoContext" class="btn btn-secondary w-full mb-3xl">
                <span class="icon text-gold">✨</span> Nhờ AI điền thông tin tự động
            </button>
        `;

        this._container.innerHTML = html;
        this._attachCardEditorEvents(card);
    },

    /**
     * Bind events for Card Editor logic
     */
    _attachCardEditorEvents(card) {
        document.getElementById('btnBackFromEditor')?.addEventListener('click', () => {
            this._state.currentView = 'detail';
            this._renderMainView();
        });

        // Open Scanner
        const openScanner = () => {
            if (typeof CardScanner !== 'undefined') {
                CardScanner.openForCard(card.id, () => {
                    // Refresh view automatically on success capture
                    this._renderCardEditor(); 
                });
            } else {
                Toast.error("Card Scanner module not loaded.");
            }
        };

        document.getElementById('btnOpenScanner')?.addEventListener('click', openScanner);
        document.getElementById('btnOpenScannerMini')?.addEventListener('click', openScanner);

        // Save
        document.getElementById('btnSaveCard')?.addEventListener('click', async () => {
            try {
                Loading.show("Đang lưu...");
                card.nameVi = document.getElementById('cardNameVi').value.trim();
                card.keywords = document.getElementById('cardKeywords').value.split(',').map(s => s.trim()).filter(Boolean);
                card.details = document.getElementById('cardDetails').value.trim();
                card.reversedDetails = document.getElementById('cardRevDetails').value.trim();

                await Store.set(STORES.CARDS, card);
                await Store.addToSyncQueue('update', STORES.CARDS, card.id, card);
                
                Toast.success("Lưu chi tiết lá bài thành công.");
                this._state.currentView = 'detail';
                this._renderMainView();
            } catch (e) {
                console.error(e);
                Toast.error("Lỗi khi lưu!");
            } finally {
                Loading.hide();
            }
        });

        // Magic Auto Context using Gemini via Prompt
        document.getElementById('btnAiAutoContext')?.addEventListener('click', async () => {
             const deck = this._state.decks.find(d => d.id === card.deckId);
             const deckName = deck ? deck.name : 'Unknown Deck';

             try {
                Loading.show("AI đang đọc Tarot...");
                
                const result = await AIService.generateCardDetails(deckName, card.name, card.companionText || '');
                
                // Update DOM inputs
                document.getElementById('cardNameVi').value = result.nameVi || '';
                document.getElementById('cardKeywords').value = (result.keywords || []).join(', ');
                document.getElementById('cardDetails').value = result.details || '';
                document.getElementById('cardRevDetails').value = result.reversedDetails || '';

                Toast.success("Đã điền tự động! Đừng quên bấm 'Lưu'.");
             } catch(err) {
                 console.error(err);
                 Toast.error("Lỗi AI: " + err.message);
             } finally {
                 Loading.hide();
             }
        });
    },

    // ==========================================
    // Image URL Helpers for Auto-Fetch
    // ==========================================

    /**
     * Get Wikipedia Commons thumbnail path for RWS cards
     * Returns null if card name can't be mapped
     */
    _getWikiPath(cardName) {
        // RWS cards on Wikimedia Commons follow this pattern:
        // Major Arcana: "RWS_Tarot_00_Fool.jpg" etc.
        // Source: https://commons.wikimedia.org/wiki/Category:Rider-Waite-Smith_tarot_deck
        const majorMap = {
            'The Fool': '4/4a/RWS_Tarot_00_Fool.jpg/200px-RWS_Tarot_00_Fool.jpg',
            'The Magician': 'd/de/RWS_Tarot_01_Magician.jpg/200px-RWS_Tarot_01_Magician.jpg',
            'The High Priestess': '8/88/RWS_Tarot_02_High_Priestess.jpg/200px-RWS_Tarot_02_High_Priestess.jpg',
            'The Empress': 'd/d2/RWS_Tarot_03_Empress.jpg/200px-RWS_Tarot_03_Empress.jpg',
            'The Emperor': 'c/c3/RWS_Tarot_04_Emperor.jpg/200px-RWS_Tarot_04_Emperor.jpg',
            'The Hierophant': '8/8d/RWS_Tarot_05_Hierophant.jpg/200px-RWS_Tarot_05_Hierophant.jpg',
            'The Lovers': '3/3a/RWS_Tarot_06_Lovers.jpg/200px-RWS_Tarot_06_Lovers.jpg',
            'The Chariot': '9/9b/RWS_Tarot_07_Chariot.jpg/200px-RWS_Tarot_07_Chariot.jpg',
            'Strength': 'f/f5/RWS_Tarot_08_Strength.jpg/200px-RWS_Tarot_08_Strength.jpg',
            'The Hermit': '4/4d/RWS_Tarot_09_Hermit.jpg/200px-RWS_Tarot_09_Hermit.jpg',
            'Wheel of Fortune': '3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg/200px-RWS_Tarot_10_Wheel_of_Fortune.jpg',
            'Justice': 'e/e0/RWS_Tarot_11_Justice.jpg/200px-RWS_Tarot_11_Justice.jpg',
            'The Hanged Man': '2/2b/RWS_Tarot_12_Hanged_Man.jpg/200px-RWS_Tarot_12_Hanged_Man.jpg',
            'Death': 'd/d7/RWS_Tarot_13_Death.jpg/200px-RWS_Tarot_13_Death.jpg',
            'Temperance': 'f/f8/RWS_Tarot_14_Temperance.jpg/200px-RWS_Tarot_14_Temperance.jpg',
            'The Devil': '5/55/RWS_Tarot_15_Devil.jpg/200px-RWS_Tarot_15_Devil.jpg',
            'The Tower': '5/53/RWS_Tarot_16_Tower.jpg/200px-RWS_Tarot_16_Tower.jpg',
            'The Star': 'd/db/RWS_Tarot_17_Star.jpg/200px-RWS_Tarot_17_Star.jpg',
            'The Moon': '7/7f/RWS_Tarot_18_Moon.jpg/200px-RWS_Tarot_18_Moon.jpg',
            'The Sun': '1/17/RWS_Tarot_19_Sun.jpg/200px-RWS_Tarot_19_Sun.jpg',
            'Judgement': 'd/dd/RWS_Tarot_20_Judgement.jpg/200px-RWS_Tarot_20_Judgement.jpg',
            'The World': 'f/ff/RWS_Tarot_21_World.jpg/200px-RWS_Tarot_21_World.jpg'
        };

        if (majorMap[cardName]) return majorMap[cardName];

        // Minor Arcana: Try pattern "Suit_NN.jpg"
        const suitMap = { 'Wands': 'Wands', 'Cups': 'Cups', 'Swords': 'Swords', 'Pentacles': 'Pents' };
        const rankMap = {
            'Ace': '01', 'Two': '02', 'Three': '03', 'Four': '04', 'Five': '05',
            'Six': '06', 'Seven': '07', 'Eight': '08', 'Nine': '09', 'Ten': '10',
            'Page': '11', 'Knight': '12', 'Queen': '13', 'King': '14'
        };

        for (const [suit, suitCode] of Object.entries(suitMap)) {
            for (const [rank, num] of Object.entries(rankMap)) {
                if (cardName.includes(rank) && cardName.includes(suit)) {
                    return null; // Wikimedia minor arcana paths are inconsistent, skip
                }
            }
        }

        return null;
    },

    /**
     * Get Sacred Texts image path for RWS cards (not always CORS-enabled)
     */
    _getSacredTextPath(cardName) {
        // Sacred texts uses filenames like "ar00.jpg" for major arcana
        // This is a best-effort mapping
        return null; // Disabled: sacred-texts blocks CORS
    },

    // ==========================================
    // Utils
    // ==========================================
    _sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

window.DeckManager = DeckManager;
