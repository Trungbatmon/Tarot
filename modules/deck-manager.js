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
        
        this._initGlobalPasteHandler();
        
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
        const viewMode = this._state.deckViewMode || 'grid-lg';

        let decksHtml = '';

        if (filteredDecks.length === 0) {
            decksHtml = `
                <div class="empty-state">
                    <span class="empty-state-icon">🃏</span>
                    <h3 class="empty-state-title">${App.t('deck.empty')}</h3>
                    <p class="empty-state-desc">${App.t('deck.emptyDesc')}</p>
                    <div class="flex gap-sm justify-center mt-md">
                        <button id="btnCreateDeckEmpty" class="btn btn-primary">+ ${App.t('common.add')} Bộ Bài</button>
                        <button id="btnImportDeckEmpty" class="btn btn-secondary">📥 Nhập (Import)</button>
                    </div>
                </div>
            `;
        } else {
            const gridMin = viewMode === 'grid-sm' ? '110px' : (viewMode === 'list' ? '100%' : '160px');
            decksHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(${gridMin}, 1fr)); gap: 16px; margin-top: 16px;">`;
            filteredDecks.forEach(deck => {
                const imgBlob = deck.coverImage || deck.backImage;
                let backImgUrl = null;
                if (imgBlob && (imgBlob instanceof Blob || imgBlob instanceof File)) {
                    try {
                        backImgUrl = URL.createObjectURL(imgBlob);
                    } catch(e) {
                        console.error('Invalid image blob', e);
                    }
                }
                const style = backImgUrl ? `background-image: url('${backImgUrl}'); background-size: cover; background-position: center;` : '';
                
                decksHtml += `
                    <div class="card deck-card relative ${viewMode === 'list' ? 'flex items-center gap-md' : ''}" data-id="${deck.id}">
                        ${deck.isDefault ? `<span class="badge badge-default absolute top-2 right-2 z-10" style="position:absolute; top:8px; right:8px; z-index:10;">${App.t('deck.default')}</span>` : ''}
                        
                        <div class="tarot-card-scene" style="${viewMode === 'list' ? 'width: 60px; margin-bottom: 0;' : 'margin-bottom: var(--space-md); aspect-ratio: 2/3;'}">
                            <div class="tarot-card no-animation">
                                <div class="tarot-card-face tarot-card-back" style="${style}">
                                    ${!backImgUrl ? '<div class="card-back-placeholder">🔮</div>' : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="${viewMode === 'list' ? 'flex-1' : ''}">
                            <h4 class="text-md font-bold mb-xs" style="color: var(--text-primary); ${viewMode === 'list' ? 'text-align: left;' : 'text-align: center;'}">
                                ${this._sanitize(deck.name)}
                            </h4>
                            
                            <div class="text-xs text-muted mb-md" style="${viewMode === 'list' ? 'text-align: left; margin-bottom:0;' : 'text-align: center;'}">
                                ${deck.cardCount ? `${deck.cardCount} cards` : '...'}
                            </div>
                        </div>
                        
                        <div class="flex gap-sm ${viewMode === 'list' ? '' : 'w-full'}">
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
                <div class="flex gap-sm items-center">
                    <div class="flex gap-xs" id="deckViewModeSwitcher">
                        <button class="btn btn-sm ${(this._state.deckViewMode || 'grid-lg') === 'grid-lg' ? 'btn-primary' : 'btn-secondary'}" data-mode="grid-lg" style="padding: 4px; min-height: 28px;" title="Ảnh Lớn">🔲</button>
                        <button class="btn btn-sm ${this._state.deckViewMode === 'grid-sm' ? 'btn-primary' : 'btn-secondary'}" data-mode="grid-sm" style="padding: 4px; min-height: 28px;" title="Ảnh Nhỏ">▦</button>
                        <button class="btn btn-sm ${this._state.deckViewMode === 'list' ? 'btn-primary' : 'btn-secondary'}" data-mode="list" style="padding: 4px; min-height: 28px;" title="Danh Sách">📄</button>
                    </div>
                    <button id="btnImportDeckList" class="btn btn-secondary btn-sm" title="Nhập file bộ bài/backup JSON">📥</button>
                    <button id="btnCreateDeckList" class="btn btn-primary btn-sm">+ ${App.t('common.add')}</button>
                </div>
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
                <label class="btn btn-secondary w-full relative">
                    🖼️ Thay ảnh đại diện
                    <input type="file" id="menuChangeCover" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                </label>
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
            
            document.getElementById('menuChangeCover')?.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                    Loading.show("Đang lưu ảnh...");
                    deck.coverImage = file;
                    deck.updatedAt = Date.now();
                    await Store.set(STORES.DECKS, deck);
                    await Store.addToSyncQueue('update', STORES.DECKS, deck.id, deck);
                    Modal.close();
                    Toast.success("Đã cập nhật ảnh đại diện.");
                    this._renderListView();
                } catch (err) {
                    console.error(err);
                    Toast.error("Lỗi khi lưu ảnh: " + err.message);
                } finally {
                    Loading.hide();
                }
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

        // View Mode switching
        document.querySelectorAll('#deckViewModeSwitcher button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this._state.deckViewMode = e.currentTarget.dataset.mode;
                this._renderListView();
            });
        });

        // Create
        const handleCreate = () => {
            this._state.currentView = 'create';
            this._renderMainView();
        };

        const handleImport = () => {
            let oldInput = document.getElementById('hiddenImportInputMain');
            if (oldInput) oldInput.remove();

            const input = document.createElement('input');
            input.id = 'hiddenImportInputMain';
            input.type = 'file';
            input.accept = '.json,application/json';
            input.style.display = 'none';
            document.body.appendChild(input);

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) { input.remove(); return; }
                const yes = await Modal.confirm("Nhập bộ bài", "Dữ liệu mới sẽ được ghi đè hoặc thêm vào (tuỳ ID). Bạn có tiếp tục?");
                if (!yes) { input.remove(); return; }
                
                try {
                    Loading.show("Đang import...");
                    const text = await new Promise((res, rej) => {
                        const reader = new FileReader();
                        reader.onload = e => res(e.target.result);
                        reader.onerror = e => rej(e);
                        reader.readAsText(file);
                    });
                    const data = JSON.parse(text);
                    await Store.importAll(data);
                    
                    if (data.settings) {
                        App.settings = await Store.getAllSettings();
                    }
                    Toast.success("Nhập thành công! Đang tự động tải lại...");
                    setTimeout(() => window.location.reload(), 1500);
                } catch(err) {
                    Toast.error("Lỗi dữ liệu: " + err.message);
                } finally {
                    Loading.hide();
                    input.remove();
                }
            };
            input.click();
        };

        // Header buttons
        document.getElementById('btnCreateDeckList')?.addEventListener('click', handleCreate);
        document.getElementById('btnImportDeckList')?.addEventListener('click', handleImport);

        // Empty state buttons
        document.getElementById('btnCreateDeckEmpty')?.addEventListener('click', handleCreate);
        document.getElementById('btnImportDeckEmpty')?.addEventListener('click', handleImport);

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
                    ${!(typeof AIService.isAIAvailable === 'function' ? AIService.isAIAvailable() : AIService.isGeminiAvailable()) && this._state.activeCategory !== 'lenormand' ? 
                        `<div class="badge badge-warning text-sm p-sm mb-sm block">⚠️ Bạn chưa cấu hình API Key trong Cài đặt (Gemini/OpenAI). Nhập "Standard" cho bộ Tarot mặc định, hoặc tự tạo list thủ công.</div>` 
                    : ''}
                    
                    <button id="btnAiSuggest" class="btn btn-primary w-full">
                        <span class="icon">✨</span> Tự động tạo bằng AI
                    </button>
                    
                    <div class="divider-label">HOẶC</div>

                    <div class="flex gap-sm">
                        <input type="number" id="manualCardCount" class="form-input" placeholder="Số lượng lá" min="1" max="150" value="${this._state.activeCategory === 'tarot' ? '78' : '36'}">
                        <button id="btnManualCreate" class="btn btn-secondary whitespace-nowrap">Tạo thủ công</button>
                    </div>

                    <div class="divider-label">HOẶC</div>

                    <div class="flex flex-col gap-sm">
                        <textarea id="importText" class="form-textarea text-xs" rows="4" placeholder="Dán danh sách lá bài vào đây (mỗi lá 1 dòng) hoặc dán chuỗi JSON... Hoặc tải lên file .txt, .csv, .json"></textarea>
                        <div class="flex gap-sm">
                            <label class="btn btn-secondary flex-1 relative text-center">
                                📁 Chọn File (.txt, .json)
                                <input type="file" id="btnImportTextFile" accept=".txt,.csv,.json" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                            </label>
                            <button id="btnImportText" class="btn btn-secondary flex-1">Tạo từ dữ liệu trên</button>
                        </div>
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

        // Import from File (.txt/.csv)
        document.getElementById('btnImportTextFile')?.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                document.getElementById('importText').value = text;
                Toast.success("Đã tải nội dung file, bấm 'Tạo từ danh sách trên' để tiếp tục!");
            };
            reader.onerror = () => Toast.error("Không thể đọc file.");
            reader.readAsText(file);
        });

        // Import from Text (textarea)
        document.getElementById('btnImportText')?.addEventListener('click', () => {
            const textArea = document.getElementById('importText');
            const rawText = textArea.value.trim();
            
            if (!rawText) {
                return Toast.warning("Vui lòng nhập danh sách/JSON lá bài hoặc chọn file.");
            }

            // Try to parse as JSON first
            try {
                const parsed = JSON.parse(rawText);
                if (Array.isArray(parsed)) {
                    if (parsed.length > 300) return Toast.warning("Danh sách quá dài (tối đa 300 lá).");
                    
                    const cards = parsed.map((item, i) => {
                        if (typeof item === 'string') return { name: item, suit: null, arcana: null };
                        return {
                            name: item.name || `Card ${i + 1}`,
                            nameVi: item.nameVi || '',
                            suit: item.suit || null,
                            arcana: item.arcana || null,
                            keywordsVi: item.keywordsVi || [],
                            detailsVi: item.detailsVi || '',
                            reversedDetailsVi: item.reversedDetailsVi || ''
                        };
                    });
                    
                    showPreview(cards);
                    Toast.success(`Đã nhận diện đủ ${cards.length} lá bài qua định dạng JSON.`);
                    return; // Exit function successfully
                }
            } catch (err) {
                // Not a JSON Array, silently fallback to line-by-line parsing
            }

            // Fallback: Parse line by line
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length === 0) {
                return Toast.warning("Không tìm thấy tên bài hợp lệ từ nội dung văn bản.");
            }

            if (lines.length > 300) {
                return Toast.warning("Danh sách quá dài (tối đa 300 lá).");
            }

            const cards = lines.map(line => {
                // If CSV format like "name,suit,arcana", simple parse
                let name = line;
                if (line.includes(',') && line.split(',').length >= 2) {
                    name = line.split(',')[0].trim();
                }
                return {
                    name: name,
                    suit: null,
                    arcana: null
                };
            });
            showPreview(cards);
            Toast.success(`Đã nhận diện được ${cards.length} lá bài.`);
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
                        nameVi: sc.nameVi || '',
                        number: i + 1,
                        suit: sc.suit || null,
                        arcana: sc.arcana || null,
                        image: null,
                        imageUrl: null,
                        imageDownloaded: false,
                        keywords: [],
                        keywordsVi: sc.keywordsVi || [],
                        details: '',
                        detailsVi: sc.detailsVi || '',
                        reversedDetails: '',
                        reversedDetailsVi: sc.reversedDetailsVi || '',
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

            let backImgUrl = null;
            if (deck.backImage && (deck.backImage instanceof Blob || deck.backImage instanceof File)) {
                try { backImgUrl = URL.createObjectURL(deck.backImage); } catch(e){}
            }
            const backStyle = backImgUrl ? `background-image: url('${backImgUrl}'); background-size: cover;` : '';

            // Render Cards as vertical list with status indicators
            let cardsHtml = '<div class="card-list-vertical mb-3xl">';
            cards.forEach(card => {
                const hasImage = !!(card.image || card.imageUrl);
                const hasKeywords = card.keywords && card.keywords.length > 0;
                const hasDetails = !!(card.details && card.details.trim());
                const hasReversed = !!(card.reversedDetails && card.reversedDetails.trim());
                const hasCompanion = !!(card.companionText && card.companionText.trim());
                const hasNameVi = !!(card.nameVi && card.nameVi.trim());
                
                const allDone = hasImage && hasKeywords && hasDetails;
                const isSelected = this._state.selectedCards && this._state.selectedCards.has(card.id);
                
                cardsHtml += `
                    <div class="card-list-item ${allDone ? 'card-complete' : ''} ${isSelected ? 'selected text-gold' : ''}" data-cardid="${card.id}" style="${isSelected ? 'background: rgba(212, 165, 116, 0.1); border-color: var(--gold-primary);' : ''}">
                        ${this._state.isSelectMode ? `
                        <div class="card-select-checkbox flex items-center justify-center mr-sm">
                            <div style="width: 20px; height: 20px; border: 2px solid ${isSelected ? 'var(--gold-primary)' : 'var(--text-muted)'}; border-radius: 4px; background: ${isSelected ? 'var(--gold-primary)' : 'transparent'};"></div>
                        </div>
                        ` : ''}
                        <div class="card-list-number">${card.number || '—'}</div>
                        <div class="card-list-info">
                            <div class="card-list-name">${this._sanitize(card.name)}${hasNameVi ? ` <span class="text-muted text-xs">(${this._sanitize(card.nameVi)})</span>` : ''}</div>
                            <div class="card-list-badges">
                                <span class="status-dot ${hasImage ? 'dot-ok' : 'dot-miss'}" title="Hình ảnh">🖼️</span>
                                <span class="status-dot ${hasKeywords ? 'dot-ok' : 'dot-miss'}" title="Từ khóa">🏷️</span>
                                <span class="status-dot ${hasDetails ? 'dot-ok' : 'dot-miss'}" title="Ý nghĩa xuôi">📖</span>
                                <span class="status-dot ${hasReversed ? 'dot-ok' : 'dot-miss'}" title="Ý nghĩa ngược">🔄</span>
                                <span class="status-dot ${hasCompanion ? 'dot-ok' : 'dot-miss'}" title="Companion">📚</span>
                            </div>
                        </div>
                        ${!this._state.isSelectMode ? '<div class="card-list-arrow">›</div>' : ''}
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
                                <label class="btn btn-secondary btn-sm relative" id="btnImportBackImage">
                                    Import Mặt Sau
                                    <input type="file" id="backImageFileInput" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                                </label>
                                <button class="btn btn-secondary btn-sm" id="btnPasteBackImage" title="Dán ảnh từ clipboard">📋 Dán Mặt Sau</button>
                                <button class="btn btn-primary btn-sm" id="btnImportCompanionDetail">Import Sách Hướng Dẫn</button>
                                <button class="btn btn-secondary btn-sm" id="btnAutoFetchImages" title="Tự động tải hình từ web">🌐 Tải hình tự động</button>
                                <button class="btn btn-secondary btn-sm" id="btnBulkAutoContext" title="Tự động dùng AI điền chi tiết cho các lá bài còn trống">✨ Tự động điền chi tiết</button>
                                <button class="btn btn-secondary btn-icon" title="Scan từng lá qua Camera" id="btnBatchScan">📷</button>
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="section-subtitle flex justify-between items-center p-sm rounded sticky top-14 z-10" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);">
                    <span>Lá Bài (${cards.length})</span>
                    <button class="btn btn-icon btn-secondary" style="width:30px;height:30px;" title="Thêm lá bài trống" id="btnAddSingleCard">+</button>
                </h3>
                
                <div class="flex gap-sm justify-between items-center mb-md">
                    <div class="card mb-0 p-sm flex-1" style="font-size: 0.7em;">
                        <div class="flex gap-md justify-center text-muted flex-wrap">
                            <span>🖼️ <strong class="text-gold">${cards.filter(c => c.image || c.imageUrl).length}</strong>/${cards.length}</span>
                            <span>🏷️ <strong class="text-gold">${cards.filter(c => c.keywords?.length).length}</strong>/${cards.length}</span>
                            <span>📖 <strong class="text-gold">${cards.filter(c => c.details?.trim()).length}</strong>/${cards.length}</span>
                            <span>📚 <strong class="text-gold">${cards.filter(c => c.companionText?.trim()).length}</strong>/${cards.length}</span>
                        </div>
                    </div>
                </div>

                <div class="flex gap-xs mb-md justify-between items-center" id="viewModeSwitcher">
                    <div class="flex gap-xs">
                        <button class="btn btn-sm ${(this._state.cardViewMode || 'list') === 'list' ? 'btn-primary' : 'btn-secondary'}" data-mode="list" title="Danh sách">☰</button>
                        <button class="btn btn-sm ${this._state.cardViewMode === 'grid-sm' ? 'btn-primary' : 'btn-secondary'}" data-mode="grid-sm" title="Ảnh nhỏ">▦</button>
                        <button class="btn btn-sm ${this._state.cardViewMode === 'grid-lg' ? 'btn-primary' : 'btn-secondary'}" data-mode="grid-lg" title="Ảnh lớn">▣</button>
                    </div>
                    <button class="btn btn-sm ${this._state.isSelectMode ? 'btn-primary' : 'btn-secondary'}" id="btnToggleSelectMode">
                        <span class="icon">☑</span> ${this._state.isSelectMode ? 'Hủy chọn' : 'Chọn nhiều'}
                    </button>
                </div>

                ${cardsHtml}

                ${this._renderCardGrid(cards, 'grid-sm')}
                ${this._renderCardGrid(cards, 'grid-lg')}

                ${this._state.isSelectMode && this._state.selectedCards && this._state.selectedCards.size > 0 ? `
                <div class="fixed bottom-0 left-0 right-0 p-md flex gap-sm items-center justify-between z-50 card" style="background: var(--bg-secondary); border-top: 1px solid var(--border-color); border-radius: 0; margin: 0; box-shadow: 0 -4px 12px rgba(0,0,0,0.5);">
                    <div class="text-gold font-bold">Đã chọn: ${this._state.selectedCards.size}</div>
                    <div class="flex gap-sm">
                        <button class="btn btn-sm btn-danger" id="btnBatchDeleteDetails">Xóa chi tiết</button>
                    </div>
                </div>
                ` : ''}
            `;

            this._container.innerHTML = html;
            
            document.getElementById('btnBackFromDetail')?.addEventListener('click', () => {
                this._state.currentView = 'list';
                this._renderMainView();
            });

            // --- View Mode Switcher ---
            const currentMode = this._state.cardViewMode || 'list';
            // Show only the active view
            document.querySelector('.card-list-vertical').style.display = currentMode === 'list' ? 'flex' : 'none';
            document.querySelector('.card-grid-sm')?.style && (document.querySelector('.card-grid-sm').style.display = currentMode === 'grid-sm' ? 'grid' : 'none');
            document.querySelector('.card-grid-lg')?.style && (document.querySelector('.card-grid-lg').style.display = currentMode === 'grid-lg' ? 'grid' : 'none');

            document.querySelectorAll('#viewModeSwitcher button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this._state.cardViewMode = e.target.dataset.mode;
                    this._renderDeckDetail(); // Re-render to update active state
                });
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

            // --- Paste Back Image ---
            document.getElementById('btnPasteBackImage')?.addEventListener('click', async () => {
                try {
                    const clipItems = await navigator.clipboard.read();
                    for (const item of clipItems) {
                        const imageType = item.types.find(t => t.startsWith('image/'));
                        if (imageType) {
                            const blob = await item.getType(imageType);
                            const file = new File([blob], 'pasted_back_image.png', { type: imageType });
                            
                            Loading.show("Đang lưu mặt sau...");
                            deck.backImage = file;
                            deck.updatedAt = Date.now();
                            await Store.set(STORES.DECKS, deck);
                            await Store.addToSyncQueue('update', STORES.DECKS, deck.id, deck);
                            
                            const idx = this._state.decks.findIndex(d => d.id === deck.id);
                            if (idx >= 0) this._state.decks[idx] = deck;
                            
                            Toast.success("Đã dán mặt sau thành công!");
                            this._renderDeckDetail();
                            return;
                        }
                    }
                    Toast.warning("Clipboard không chứa hình ảnh. Hãy copy ảnh trước rồi bấm Dán.");
                } catch (err) {
                    Toast.error("Không thể đọc clipboard. Vui lòng bấm Cho phép quyền dán hoặc thử Nhấn giữ rồi Dán ảnh.");
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

                        let fetched = false;
                        const wikiFilename = this._getWikiPath(card.name);
                        
                        if (wikiFilename) {
                            try {
                                const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(wikiFilename)}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`;
                                const apiRes = await fetch(apiUrl);
                                if (apiRes.ok) {
                                    const apiJson = await apiRes.json();
                                    const pages = apiJson.query?.pages;
                                    if (pages) {
                                        const page = Object.values(pages)[0];
                                        const imgUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
                                        
                                        if (imgUrl) {
                                            const imgRes = await fetch(imgUrl, { mode: 'cors' });
                                            if (imgRes.ok) {
                                                const blob = await imgRes.blob();
                                                if (blob.size > 1000) {
                                                    card.image = new File([blob], `${slug}.jpg`, { type: blob.type });
                                                    card.imageUrl = imgUrl;
                                                    card.imageDownloaded = true;
                                                    await Store.set(STORES.CARDS, card);
                                                    successCount++;
                                                    fetched = true;
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (err) {
                                console.warn("Lỗi tải hình từ Wiki:", err);
                            }
                        }

                        if (!fetched) {
                            // Fallback 1: Try AI generation if Wikipedia didn't work or file wasn't found
                            try {
                                const aiPrompt = `Tarot card ${card.name} Rider Waite Smith style classic tarot deck isolated high quality full color`;
                                const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPrompt)}?width=420&height=700&nologo=true&seed=42`;
                                const imgRes = await fetch(aiUrl);
                                if (imgRes.ok) {
                                    const blob = await imgRes.blob();
                                    if (blob.size > 1000) {
                                        card.image = new File([blob], `${slug}_ai.jpg`, { type: blob.type });
                                        card.imageUrl = aiUrl;
                                        card.imageDownloaded = true;
                                        await Store.set(STORES.CARDS, card);
                                        successCount++;
                                        fetched = true;
                                    }
                                }
                            } catch (fallbackErr) {
                                console.warn("Lỗi tải hình từ AI fallback:", fallbackErr);
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

            // --- Bulk Auto Context via AI ---
            document.getElementById('btnBulkAutoContext')?.addEventListener('click', async () => {
                let targetCards = cards.filter(c => !c.details && !c.reversedDetails);
                if (this._state.isSelectMode && this._state.selectedCards && this._state.selectedCards.size > 0) {
                    targetCards = cards.filter(c => this._state.selectedCards.has(c.id));
                }
                
                if (targetCards.length === 0) {
                    return Toast.info("Không có lá bài nào để xử lý!");
                }
                
                const customPrompt = prompt(`Sẽ nhờ AI phân tích lại nội dung cho ${targetCards.length} lá bài.\nCó ghi chú gì đặc biệt cho AI không? (Ví dụ: "Viết ngắn gọn", "Phong cách thơ")\nĐể trống nếu không cần thiết:`);
                if (customPrompt === null) return; // User cancelled

                let successCount = 0;
                let failCount = 0;
                
                for (let i = 0; i < targetCards.length; i++) {
                    const card = targetCards[i];
                    Loading.show(`AI đang phân tích (${i + 1}/${targetCards.length}): ${card.name}`);
                    
                    try {
                        const result = await AIService.generateCardDetails(deck.name, card.name, card.companionText || '', customPrompt.trim());
                        
                        card.nameVi = result.nameVi || card.nameVi;
                        card.nameEn = result.nameEn || card.nameEn;
                        card.keywords = result.keywords && result.keywords.length ? result.keywords : card.keywords;
                        card.keywordsEn = result.keywordsEn && result.keywordsEn.length ? result.keywordsEn : card.keywordsEn;
                        card.details = result.details || card.details;
                        card.detailsEn = result.detailsEn || card.detailsEn;
                        card.reversedDetails = result.reversedDetails || card.reversedDetails;
                        card.reversedDetailsEn = result.reversedDetailsEn || card.reversedDetailsEn;
                        
                        await Store.set(STORES.CARDS, card);
                        await Store.addToSyncQueue('update', STORES.CARDS, card.id, card);
                        successCount++;
                    } catch (err) {
                        console.error(`Lỗi giải nghĩa ${card.name}:`, err);
                        failCount++;
                    }
                }
                
                Loading.hide();
                Toast.success(`Hoàn tất AI! ✅ ${successCount} thành công, ❌ ${failCount} lỗi.`);
                this._state.isSelectMode = false;
                if (this._state.selectedCards) this._state.selectedCards.clear();
                this._renderDeckDetail();
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

            // --- Multi Select Mode Toggle ---
            document.getElementById('btnToggleSelectMode')?.addEventListener('click', () => {
                this._state.isSelectMode = !this._state.isSelectMode;
                if (!this._state.isSelectMode) {
                    this._state.selectedCards = new Set();
                } else if (!this._state.selectedCards) {
                    this._state.selectedCards = new Set();
                }
                this._renderDeckDetail();
            });

            // --- Batch Delete ---
            document.getElementById('btnBatchDeleteDetails')?.addEventListener('click', async () => {
                if (!this._state.selectedCards || this._state.selectedCards.size === 0) return;
                
                const opts = `
                    <div class="flex flex-col gap-sm p-sm">
                        <label class="flex items-center gap-md cursor-pointer p-sm hover:bg-white/5 rounded">
                            <input type="checkbox" id="chkDelImg" class="form-checkbox" style="width:20px;height:20px;"> 
                            <span class="text-lg">Xóa hình ảnh</span>
                        </label>
                        <label class="flex items-center gap-md cursor-pointer p-sm hover:bg-white/5 rounded">
                            <input type="checkbox" id="chkDelDetails" class="form-checkbox" style="width:20px;height:20px;" checked> 
                            <span class="text-lg">Xóa nội dung Ý nghĩa & Từ khóa</span>
                        </label>
                        <label class="flex items-center gap-md cursor-pointer p-sm hover:bg-white/5 rounded">
                            <input type="checkbox" id="chkDelCompanion" class="form-checkbox" style="width:20px;height:20px;"> 
                            <span class="text-lg">Xóa Companion Text</span>
                        </label>
                    </div>
                `;
                
                const confirmed = await Modal.confirm("Tùy chọn Xóa Hàng Loạt", opts);
                if (!confirmed) return;
                
                const delImg = document.getElementById('chkDelImg')?.checked;
                const delDetails = document.getElementById('chkDelDetails')?.checked;
                const delComp = document.getElementById('chkDelCompanion')?.checked;
                
                Loading.show("Đang xóa...");
                for (const cardId of this._state.selectedCards) {
                    const c = this._state.cards.find(x => x.id === cardId);
                    if (!c) continue;
                    
                    if (delImg) {
                        c.image = null;
                        c.imageUrl = null;
                        c.imageDownloaded = false;
                    }
                    if (delDetails) {
                        c.details = '';
                        c.reversedDetails = '';
                        c.detailsEn = '';
                        c.reversedDetailsEn = '';
                        c.keywords = [];
                        c.keywordsEn = [];
                    }
                    if (delComp) {
                        c.companionText = '';
                        c.companionTextEn = '';
                    }
                    await Store.set(STORES.CARDS, c);
                }
                Loading.hide();
                Toast.success("Đã xóa dữ liệu thành công.");
                this._state.selectedCards.clear();
                this._state.isSelectMode = false;
                this._renderDeckDetail();
            });

            // Card Click Events to open Editor (all view modes)
            document.querySelectorAll('.card-list-item[data-cardid], .card-grid-item[data-cardid]').forEach(el => {
                el.addEventListener('click', (e) => {
                    const cardId = e.currentTarget.dataset.cardid;
                    if (this._state.isSelectMode) {
                        if (this._state.selectedCards.has(cardId)) {
                            this._state.selectedCards.delete(cardId);
                        } else {
                            this._state.selectedCards.add(cardId);
                        }
                        this._renderDeckDetail(); // Re-render to update checkbox visuals
                    } else {
                        this._state.currentView = 'edit-card';
                        this._state.editingCardId = cardId;
                        this._renderMainView();
                    }
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

        let frontImgUrl = null;
        if (card.image && (card.image instanceof Blob || card.image instanceof File)) {
            try { frontImgUrl = URL.createObjectURL(card.image); } catch(e){}
        }
        const frontStyle = frontImgUrl ? `background-image: url('${frontImgUrl}'); background-size: cover;` : '';

        const html = `
            <div class="flex items-center justify-between mb-lg">
                <div class="flex items-center gap-sm cursor-pointer text-muted" id="btnBackFromEditor">
                    <span class="text-lg">←</span> <span>Chi tiết bộ bài</span>
                </div>
            </div>

            <h2 class="section-title text-center mb-0">${this._sanitize(card.name)}</h2>
            ${card.arcana || card.suit ? `<p class="text-center text-muted text-sm mb-lg">${[card.arcana, card.suit].filter(Boolean).join(' - ')}</p>` : ''}

            <!-- Card Image -->
            <div class="card mb-xl p-md text-center">
                <div class="mb-md" id="cardImagePreview">
                    ${frontImgUrl 
                        ? `<img src="${frontImgUrl}" alt="${this._sanitize(card.name)}" style="max-height: 220px; border-radius: var(--radius-md); margin: 0 auto; display: block; border: 1px solid rgba(212,165,116,0.3);">` 
                        : `<div style="height: 160px; display:flex; align-items:center; justify-content:center; border: 2px dashed rgba(255,255,255,0.1); border-radius: var(--radius-md); color: var(--text-muted);">
                            <span>Chưa có hình ảnh</span>
                           </div>`
                    }
                </div>
                <div class="flex gap-sm justify-center flex-wrap">
                    <label class="btn btn-primary btn-sm relative">
                        📷 Chụp ảnh
                        <input type="file" id="cardImageCapture" accept="image/*" capture="environment" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    </label>
                    <label class="btn btn-secondary btn-sm relative">
                        🖼️ Chọn file
                        <input type="file" id="cardImageFile" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    </label>
                    <button class="btn btn-secondary btn-sm" id="btnPasteImage">📋 Dán ảnh</button>
                    <button class="btn btn-secondary btn-sm" id="btnSearchImage">🔍 Tìm ảnh AI</button>
                </div>
                ${card.image ? '<button class="btn btn-danger btn-sm mt-md" id="btnRemoveImage">🗑️ Xóa ảnh</button>' : ''}
            </div>

            <div class="card mb-xl p-md">
                <style>
                    .lang-tab { border-radius: 0; background: transparent; padding-bottom: 4px; opacity: 0.6; }
                    .lang-tab.active { border-bottom: 2px solid var(--gold-primary); color: var(--gold-primary); opacity: 1; }
                </style>
                <div class="flex gap-md mb-md border-b" style="border-color: rgba(255,255,255,0.1);">
                    <button class="btn btn-sm lang-tab active" id="tabLangVi">🇻🇳 Tiếng Việt</button>
                    <button class="btn btn-sm lang-tab" id="tabLangEn">🇬🇧 Tiếng Anh</button>
                </div>
                
                <div id="containerLangVi">
                    <h3 class="section-subtitle">Thông tin lá bài (VI)</h3>
                    <div class="form-group">
                        <label class="form-label" for="cardNameVi">Tên tiếng Việt</label>
                        <input type="text" id="cardNameVi" class="form-input" value="${this._sanitize(card.nameVi || '')}" placeholder="VD: Kẻ Khờ">
                    </div>
                    <div class="form-group mb-lg">
                        <label class="form-label" for="cardKeywords">Từ khóa (Keywords)</label>
                        <input type="text" id="cardKeywords" class="form-input" value="${this._sanitize((card.keywords || []).join(', '))}" placeholder="Phân cách bằng dấu phẩy...">
                    </div>
                    
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
                
                <div id="containerLangEn" style="display: none;">
                    <h3 class="section-subtitle">Card Info (EN)</h3>
                    <div class="form-group">
                        <label class="form-label" for="cardNameEn">English Name</label>
                        <input type="text" id="cardNameEn" class="form-input" value="${this._sanitize(card.nameEn || '')}" placeholder="e.g: The Fool">
                    </div>
                    <div class="form-group mb-lg">
                        <label class="form-label" for="cardKeywordsEn">Keywords</label>
                        <input type="text" id="cardKeywordsEn" class="form-input" value="${this._sanitize((card.keywordsEn || []).join(', '))}" placeholder="Comma separated...">
                    </div>
                    
                    <h3 class="section-subtitle flex justify-between items-center">
                        Interpretation
                        <button class="btn btn-xs btn-secondary" id="btnTranslateDetailsToEn">Dịch trống ➔ EN</button>
                    </h3>
                    <div class="form-group">
                        <label class="form-label" for="cardDetailsEn">Upright</label>
                        <textarea id="cardDetailsEn" class="form-textarea" style="min-height:120px;">${this._sanitize(card.detailsEn || '')}</textarea>
                    </div>
                    <div class="form-group mb-0">
                        <label class="form-label" for="cardRevDetailsEn">Reversed</label>
                        <textarea id="cardRevDetailsEn" class="form-textarea">${this._sanitize(card.reversedDetailsEn || '')}</textarea>
                    </div>
                </div>
            </div>

            ${card.companionText || card.companionTextEn ? `
            <div class="card mb-xl p-md">
                <div class="flex gap-md justify-between items-center mb-sm">
                    <h3 class="section-subtitle mb-0">📚 Nội dung Companion Book</h3>
                    <div class="flex gap-sm">
                        <button class="btn btn-xs btn-secondary" id="btnTranslateCompToVi">Dịch ➔ VI</button>
                        <button class="btn btn-xs btn-secondary" id="btnTranslateCompToEn">Dịch ➔ EN</button>
                    </div>
                </div>
                
                <div id="compLangVi" style="display: ${card.companionText ? 'block' : 'none'};">
                    <div class="text-xs text-gold mb-xs">Tiếng Việt:</div>
                    <textarea id="txtCompanionVi" class="form-textarea mb-md" style="min-height: 150px;">${this._sanitize(card.companionText || '')}</textarea>
                </div>
                
                <div id="compLangEn" style="display: ${card.companionTextEn ? 'block' : 'none'};">
                    <div class="text-xs text-gold mb-xs">English:</div>
                    <textarea id="txtCompanionEn" class="form-textarea" style="min-height: 150px;">${this._sanitize(card.companionTextEn || '')}</textarea>
                </div>
            </div>
            ` : ''}

            <div class="card mb-xl p-md">
                <div class="form-group mb-xs">
                    <label class="form-label text-gold">Nhờ AI cập nhật thông tin</label>
                    <textarea id="cardAiInstruction" class="form-input mb-sm" style="min-height:40px;" placeholder="Chỉ dẫn tùy chỉnh (VD: Viết ngắn lại, phong cách thơ...)"></textarea>
                </div>
                <button id="btnAiAutoContext" class="btn btn-secondary w-full">
                    <span class="icon text-gold">✨</span> Gọi AI tự điền toàn bộ
                </button>
            </div>

            <button id="btnSaveCard" class="btn btn-success w-full mb-3xl">💾 Lưu Chi Tiết Lá Bài</button>
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

        // --- Image: Save helper ---
        const saveImageToCard = async (file) => {
            try {
                Loading.show("Đang lưu hình...");
                card.image = file;
                card.imageUrl = null;
                card.imageDownloaded = true;
                await Store.set(STORES.CARDS, card);
                Toast.success("Đã lưu hình ảnh!");
                this._renderCardEditor(); // Refresh to show new image
            } catch (err) {
                console.error(err);
                Toast.error("Lỗi lưu hình: " + err.message);
            } finally {
                Loading.hide();
            }
        };

        // --- Image: Camera capture ---
        document.getElementById('cardImageCapture')?.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) saveImageToCard(file);
        });

        // --- Image: File import ---
        document.getElementById('cardImageFile')?.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) saveImageToCard(file);
        });

        // --- Image: Paste from clipboard ---
        document.getElementById('btnPasteImage')?.addEventListener('click', async () => {
            try {
                const clipItems = await navigator.clipboard.read();
                for (const item of clipItems) {
                    const imageType = item.types.find(t => t.startsWith('image/'));
                    if (imageType) {
                        const blob = await item.getType(imageType);
                        const file = new File([blob], 'pasted_image.png', { type: imageType });
                        await saveImageToCard(file);
                        return;
                    }
                }
                Toast.warning("Clipboard không chứa hình ảnh. Hãy copy ảnh trước rồi bấm Dán.");
            } catch (err) {
                Toast.error("Không thể đọc clipboard. Thử dùng Chọn file thay thế.");
            }
        });

        // --- Image: Remove ---
        document.getElementById('btnRemoveImage')?.addEventListener('click', async () => {
            if (!confirm("Xóa hình ảnh lá bài này?")) return;
            card.image = null;
            card.imageUrl = null;
            card.imageDownloaded = false;
            await Store.set(STORES.CARDS, card);
            Toast.success("Đã xóa hình.");
            this._renderCardEditor();
        });

        // --- Image: Gemini Search Bridge ---
        document.getElementById('btnSearchImage')?.addEventListener('click', () => {
            const deck = this._state.decks.find(d => d.id === card.deckId);
            const deckName = deck ? deck.name : '';
            const query = encodeURIComponent(`${card.name} ${deckName} tarot card image`);
            
            // Open Google Image Search in new tab
            const searchUrl = `https://www.google.com/search?tbm=isch&q=${query}`;
            window.open(searchUrl, '_blank');
            
            Toast.info("Tìm thấy hình phù hợp? Copy ảnh rồi quay lại bấm 📋 Dán ảnh!");
        });

        // --- Language Tabs ---
        const tabVi = document.getElementById('tabLangVi');
        const tabEn = document.getElementById('tabLangEn');
        const contVi = document.getElementById('containerLangVi');
        const contEn = document.getElementById('containerLangEn');
        
        tabVi?.addEventListener('click', () => {
            tabVi.classList.add('active'); tabEn.classList.remove('active');
            contVi.style.display = 'block'; contEn.style.display = 'none';
        });
        
        tabEn?.addEventListener('click', () => {
            tabEn.classList.add('active'); tabVi.classList.remove('active');
            contEn.style.display = 'block'; contVi.style.display = 'none';
        });

        // --- Translate Buttons ---
        document.getElementById('btnTranslateDetailsToEn')?.addEventListener('click', async () => {
            const txt = document.getElementById('cardDetails').value.trim();
            const txtRev = document.getElementById('cardRevDetails').value.trim();
            if (!txt && !txtRev) return Toast.info("Không có nội dung tiếng Việt để dịch");
            try {
                Loading.show("Đang dịch sang Tiếng Anh...");
                if (txt && !document.getElementById('cardDetailsEn').value.trim()) {
                    document.getElementById('cardDetailsEn').value = await AIService.translateText(txt, 'English');
                }
                if (txtRev && !document.getElementById('cardRevDetailsEn').value.trim()) {
                    document.getElementById('cardRevDetailsEn').value = await AIService.translateText(txtRev, 'English');
                }
                Toast.success("Đã hoàn tất dịch");
            } catch(e) { Toast.error(e.message); } finally { Loading.hide(); }
        });

        document.getElementById('btnTranslateCompToVi')?.addEventListener('click', async () => {
             const txt = document.getElementById('txtCompanionEn')?.value.trim() || card.companionTextEn || card.companionText;
             if (!txt) return Toast.info("Không có dữ liệu gốc để dịch");
             try {
                Loading.show("Đang dịch sang TV...");
                document.getElementById('txtCompanionVi').value = await AIService.translateText(txt, 'Vietnamese');
                Toast.success("Đã dịch xong");
             } catch(e) { Toast.error(e.message); } finally { Loading.hide(); }
        });

        document.getElementById('btnTranslateCompToEn')?.addEventListener('click', async () => {
             const txt = document.getElementById('txtCompanionVi')?.value.trim() || card.companionText;
             if (!txt) return Toast.info("Không có dữ liệu gốc để dịch");
             try {
                Loading.show("Đang dịch sang TA...");
                document.getElementById('txtCompanionEn').value = await AIService.translateText(txt, 'English');
                Toast.success("Đã dịch xong");
             } catch(e) { Toast.error(e.message); } finally { Loading.hide(); }
        });

        // Save
        document.getElementById('btnSaveCard')?.addEventListener('click', async () => {
            try {
                Loading.show("Đang lưu...");
                card.nameVi = document.getElementById('cardNameVi').value.trim();
                if(document.getElementById('cardNameEn')) card.nameEn = document.getElementById('cardNameEn').value.trim();
                
                card.keywords = document.getElementById('cardKeywords').value.split(',').map(s => s.trim()).filter(Boolean);
                if(document.getElementById('cardKeywordsEn')) card.keywordsEn = document.getElementById('cardKeywordsEn').value.split(',').map(s => s.trim()).filter(Boolean);
                
                card.details = document.getElementById('cardDetails').value.trim();
                if(document.getElementById('cardDetailsEn')) card.detailsEn = document.getElementById('cardDetailsEn').value.trim();
                
                card.reversedDetails = document.getElementById('cardRevDetails').value.trim();
                if(document.getElementById('cardRevDetailsEn')) card.reversedDetailsEn = document.getElementById('cardRevDetailsEn').value.trim();

                if (document.getElementById('txtCompanionVi')) {
                    card.companionText = document.getElementById('txtCompanionVi').value.trim();
                }
                if (document.getElementById('txtCompanionEn')) {
                    card.companionTextEn = document.getElementById('txtCompanionEn').value.trim();
                }

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
             const customPrompt = document.getElementById('cardAiInstruction')?.value.trim();

             try {
                Loading.show("AI đang đọc Tarot...");
                
                const result = await AIService.generateCardDetails(deckName, card.name, card.companionText || '', customPrompt);
                
                // Update DOM inputs safely
                if(result.nameVi) document.getElementById('cardNameVi').value = result.nameVi;
                if(result.nameEn && document.getElementById('cardNameEn')) document.getElementById('cardNameEn').value = result.nameEn;
                if(result.keywords) document.getElementById('cardKeywords').value = result.keywords.join(', ');
                if(result.keywordsEn && document.getElementById('cardKeywordsEn')) document.getElementById('cardKeywordsEn').value = result.keywordsEn.join(', ');
                if(result.details) document.getElementById('cardDetails').value = result.details;
                if(result.detailsEn && document.getElementById('cardDetailsEn')) document.getElementById('cardDetailsEn').value = result.detailsEn;
                if(result.reversedDetails) document.getElementById('cardRevDetails').value = result.reversedDetails;
                if(result.reversedDetailsEn && document.getElementById('cardRevDetailsEn')) document.getElementById('cardRevDetailsEn').value = result.reversedDetailsEn;

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
     * Get Wikipedia Commons filename for RWS cards
     * Returns filename to be used with Special:FilePath
     */
    _getWikiPath(cardName) {
        const cleanName = cardName.replace(/^(\d+)\s*[-–]\s*/, '').trim();
        
        const majorMap = {
            'The Fool': 'RWS_Tarot_00_Fool.jpg',
            'The Magician': 'RWS_Tarot_01_Magician.jpg',
            'The High Priestess': 'RWS_Tarot_02_High_Priestess.jpg',
            'The Empress': 'RWS_Tarot_03_Empress.jpg',
            'The Emperor': 'RWS_Tarot_04_Emperor.jpg',
            'The Hierophant': 'RWS_Tarot_05_Hierophant.jpg',
            'The Lovers': 'RWS_Tarot_06_Lovers.jpg',
            'The Chariot': 'RWS_Tarot_07_Chariot.jpg',
            'Strength': 'RWS_Tarot_08_Strength.jpg',
            'The Hermit': 'RWS_Tarot_09_Hermit.jpg',
            'Wheel of Fortune': 'RWS_Tarot_10_Wheel_of_Fortune.jpg',
            'Justice': 'RWS_Tarot_11_Justice.jpg',
            'The Hanged Man': 'RWS_Tarot_12_Hanged_Man.jpg',
            'Death': 'RWS_Tarot_13_Death.jpg',
            'Temperance': 'RWS_Tarot_14_Temperance.jpg',
            'The Devil': 'RWS_Tarot_15_Devil.jpg',
            'The Tower': 'RWS_Tarot_16_Tower.jpg',
            'The Star': 'RWS_Tarot_17_Star.jpg',
            'The Moon': 'RWS_Tarot_18_Moon.jpg',
            'The Sun': 'RWS_Tarot_19_Sun.jpg',
            'Judgement': 'RWS_Tarot_20_Judgement.jpg',
            'The World': 'RWS_Tarot_21_World.jpg'
        };

        if (majorMap[cleanName]) return majorMap[cleanName];

        const suitMap = { 'Wands': 'Wands', 'Cups': 'Cups', 'Swords': 'Swords', 'Pentacles': 'Pentacles' };
        for (const [suit, suitName] of Object.entries(suitMap)) {
            if (cleanName.includes(suit)) {
                // Return generic Wikipedia file format: Tarot_Nine_of_Wands.jpg
                const rankMatch = cleanName.match(/^(Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King)/i);
                if (rankMatch) {
                    return `Tarot_${rankMatch[1]}_of_${suitName}.jpg`;
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
    // Card Grid Renderers (Image Views)
    // ==========================================

    _renderCardGrid(cards, mode) {
        const isLarge = mode === 'grid-lg';
        const cssClass = isLarge ? 'card-grid-lg' : 'card-grid-sm';
        
        let html = `<div class="${cssClass} mb-3xl">`;
        cards.forEach(card => {
            let imgUrl = null;
            if (card.image && (card.image instanceof Blob || card.image instanceof File)) {
                try { imgUrl = URL.createObjectURL(card.image); } catch(e){}
            }
            
            const isSelected = this._state.selectedCards && this._state.selectedCards.has(card.id);
            
            html += `
                <div class="card-grid-item" data-cardid="${card.id}" style="position: relative; ${isSelected ? 'box-shadow: 0 0 0 3px var(--gold-primary);' : ''}">
                    ${this._state.isSelectMode ? `
                    <div style="position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; background: ${isSelected ? 'var(--gold-primary)' : 'rgba(0,0,0,0.5)'}; border: 2px solid ${isSelected ? 'var(--gold-primary)' : 'white'}; border-radius: 4px; z-index: 2; pointer-events: none;"></div>
                    ` : ''}
                    <div class="card-grid-thumb" ${imgUrl ? `style="background-image: url('${imgUrl}');"` : ''}>
                        ${!imgUrl ? `<span class="card-grid-no-img">${card.number || '?'}</span>` : ''}
                    </div>
                    <div class="card-grid-label" style="${isSelected ? 'color: var(--gold-primary);' : ''}">${this._sanitize(card.name)}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    },

    // ==========================================
    // Utils
    // ==========================================
    _sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // ==========================================
    // GLOBAL PASTE HANDLER
    // ==========================================

    _initGlobalPasteHandler() {
        if (this._hasGlobalPasteBound) return;
        this._hasGlobalPasteBound = true;

        window.addEventListener('paste', async (e) => {
            // Check if we are in a state where we accept images
            if (this._state.currentView !== 'detail' && this._state.currentView !== 'edit-card') return;
            
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;

            const items = clipboardData.items;
            let imageFile = null;
            
            for (const item of items) {
                if (item.type.indexOf('image/') === 0) {
                    imageFile = item.getAsFile();
                    break;
                }
            }

            if (!imageFile) return;

            // Optional: prevent default so the browser doesn't try assigning it to a stray input
            e.preventDefault();

            if (this._state.currentView === 'edit-card' && this._state.editingCardId) {
                // Save to card
                try {
                    Loading.show("Đang lưu ảnh dán tự động...");
                    const card = await Store.get(STORES.CARDS, this._state.editingCardId);
                    if (!card) return;
                    card.image = imageFile;
                    card.imageUrl = null;
                    card.imageDownloaded = true;
                    await Store.set(STORES.CARDS, card);
                    Toast.success("Đã lưu hình ảnh lá bài!");
                    this._renderCardEditor(); 
                } catch (err) {
                    Toast.error("Lỗi khi dán hình: " + err.message);
                } finally {
                    Loading.hide();
                }
            } else if (this._state.currentView === 'detail' && this._state.selectedDeckId) {
                // Save to deck back images
                try {
                    Loading.show("Đang lưu mặt sau...");
                    const deck = this._state.decks.find(d => d.id === this._state.selectedDeckId);
                    if (!deck) return;
                    deck.backImage = imageFile;
                    deck.updatedAt = Date.now();
                    await Store.set(STORES.DECKS, deck);
                    await Store.addToSyncQueue('update', STORES.DECKS, deck.id, deck);
                    Toast.success("Đã dán mặt sau!");
                    this._renderDeckDetail();
                } catch (err) {
                    Toast.error("Lỗi khi dán mặt sau: " + err.message);
                } finally {
                    Loading.hide();
                }
            }
        });
    }
};

window.DeckManager = DeckManager;
