/* =============================================
   Module Name — Card Reader
   Handles the logic for drawing random cards,
   3D flip interaction, and viewing readings.
   ============================================= */

const CardReader = {
    _container: null,
    _state: {
        currentView: 'setup', // setup, reading, result
        decks: [],
        spreads: [],
        selectedDeck: null,
        selectedSpread: null,
        cards: [], // Cards of the selected deck
        drawnCards: [], // Array of { card, reversed, flipped, position }
    },

    async render() {
        this._container = document.getElementById('viewDraw');
        if (!this._container) return;

        // Reset state on render if not in middle of a reading
        if (this._state.currentView !== 'reading') {
            this._state.currentView = 'setup';
        }

        await this._loadData();
        this._renderMainView();
    },

    /**
     * Start a draw session directly with a specific spread
     * @param {string} spreadId 
     */
    async openWithSpread(spreadId) {
        this._state.currentView = 'setup';
        await this._loadData();

        const spreadToSelect = this._state.spreads.find(s => s.id === spreadId);
        if (spreadToSelect) {
            this._state.selectedSpread = spreadToSelect;
        }

        // Switch active tab visually
        if (typeof App !== 'undefined' && App.navigateTo) {
            App.navigateTo('draw');
        } else {
            this.render();
        }
    },

    async _loadData() {
        this._state.decks = await Store.getAll(STORES.DECKS);
        this._state.spreads = await Store.getAll(STORES.SPREADS);
        
        // Auto select default deck if none selected
        if (!this._state.selectedDeck && this._state.decks.length > 0) {
            this._state.selectedDeck = this._state.decks.find(d => d.isDefault) || this._state.decks[0];
        }

        // Auto select first spread (usually "1 card") if not set
        if (!this._state.selectedSpread && this._state.spreads.length > 0) {
            this._state.selectedSpread = this._state.spreads[0];
        }
    },

    _renderMainView() {
        switch (this._state.currentView) {
            case 'setup':
                this._renderSetup();
                break;
            case 'reading':
                this._renderReading();
                break;
        }
    },

    // ==========================================
    // SETUP VIEW
    // ==========================================
    _renderSetup() {
        if (this._state.decks.length === 0) {
            this._container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🔮</span>
                    <h3 class="empty-state-title">Chưa có bộ bài nào</h3>
                    <p class="empty-state-desc">Hãy vào tab "Decks" để tạo bộ bài trước khi rút.</p>
                </div>
            `;
            return;
        }

        const deckOptions = this._state.decks.map(d => 
            `<option value="${d.id}" ${this._state.selectedDeck?.id === d.id ? 'selected' : ''}>
                ${this._sanitize(d.name)}
            </option>`
        ).join('');

        const spreadOptions = this._state.spreads.map(s => 
            `<option value="${s.id}" ${this._state.selectedSpread?.id === s.id ? 'selected' : ''}>
                ${this._sanitize(s.name)} (${s.positions.length} lá)
            </option>`
        ).join('');

        const html = `
            <div class="card-reader-setup max-w-md mx-auto mt-xl">
                <div class="text-center mb-xl">
                    <h2 class="section-title mb-sm text-gold" style="font-size: 28px;">Nhận Thông Điệp</h2>
                    <p class="text-muted text-sm">Hít một hơi thật sâu, tập trung vào câu hỏi của bạn.</p>
                </div>

                <div class="card mb-lg p-lg">
                    <div class="form-group">
                        <label class="form-label" for="readerDeckSelect">Chọn bộ bài sử dụng</label>
                        <select id="readerDeckSelect" class="form-select">
                            ${deckOptions}
                        </select>
                    </div>

                    <div class="form-group mb-0 relative">
                        <label class="form-label" for="readerSpreadSelect">Chọn sơ đồ trải bài</label>
                        <select id="readerSpreadSelect" class="form-select">
                            ${spreadOptions}
                        </select>
                        <div class="text-xs text-muted mt-sm" id="spreadDescText">
                            ${this._sanitize(this._state.selectedSpread?.description || '...')}
                        </div>
                    </div>
                </div>

                <button id="btnStartDraw" class="btn btn-primary w-full shadow-gold" style="height: 60px; font-size: 18px;">
                    <span class="icon">✨</span> BẮT ĐẦU RÚT BÀI
                </button>
            </div>
        `;

        this._container.innerHTML = html;
        this._attachSetupEvents();
    },

    _attachSetupEvents() {
        document.getElementById('readerDeckSelect')?.addEventListener('change', (e) => {
            const deckId = e.target.value;
            this._state.selectedDeck = this._state.decks.find(d => d.id === deckId);
        });

        document.getElementById('readerSpreadSelect')?.addEventListener('change', (e) => {
            const spreadId = e.target.value;
            this._state.selectedSpread = this._state.spreads.find(s => s.id === spreadId);
            const descEl = document.getElementById('spreadDescText');
            if (descEl && this._state.selectedSpread) {
                descEl.textContent = this._state.selectedSpread.description;
            }
        });

        document.getElementById('btnStartDraw')?.addEventListener('click', async () => {
            if (!this._state.selectedDeck) return Toast.error("Vui lòng chọn bộ bài.");
            await this._initiateDraw();
        });
    },

    async _initiateDraw() {
        Loading.show("Đang xào bài...");
        try {
            const deckId = this._state.selectedDeck.id;
            const allCards = await Store.query(STORES.CARDS, 'deckId', deckId);
            const spread = this._state.selectedSpread;
            const reqCount = spread.positions.length;
            
            if (allCards.length < reqCount) {
                return Toast.error(`Bộ bài này chỉ có ${allCards.length} lá, không thể trải sơ đồ ${reqCount} lá.`);
            }

            // Shuffle
            const shuffled = [...allCards].sort(() => Math.random() - 0.5);
            
            // Pick
            const picked = shuffled.slice(0, reqCount);
            
            // Allow Reversed?
            const allowReversed = App.settings.reversedCardsEnabled;

            this._state.drawnCards = picked.map((card, idx) => ({
                card: card,
                reversed: allowReversed ? Math.random() > 0.5 : false,
                flipped: false,
                position: spread.positions[idx]
            }));

            this._state.currentView = 'reading';
            
            // Small delay for UX
            setTimeout(() => {
                Loading.hide();
                this._renderMainView();
            }, 800);

        } catch (e) {
            console.error(e);
            Toast.error("Lỗi khi rút bài");
            Loading.hide();
        }
    },

    // ==========================================
    // READING VIEW
    // ==========================================
    _renderReading() {
        const { selectedDeck, selectedSpread, drawnCards } = this._state;
        const allFlipped = drawnCards.every(c => c.flipped);

        let cardsHtml = '';
        
        drawnCards.forEach((item, index) => {
            const c = item.card;
            
            // Image URLs
            const backImgUrl = selectedDeck?.backImage ? URL.createObjectURL(selectedDeck.backImage) : null;
            const frontImgUrl = c.image ? URL.createObjectURL(c.image) : null;
            
            const backStyle = backImgUrl ? `background-image: url('${backImgUrl}'); background-size: cover;` : '';
            const frontStyle = frontImgUrl ? `background-image: url('${frontImgUrl}'); background-size: cover;` : '';
            
            // Animation config
            const animClass = App.settings.animationsEnabled ? '' : 'no-animation';
            const disableFlipCss = !App.settings.cardFlipEnabled; // If flip is disabled, show front directly if drawn
            
            // CSS states
            const flippedClass = item.flipped || disableFlipCss ? 'flipped' : '';
            const reversedTransform = item.reversed ? 'rotateZ(180deg)' : '';

            // If flip animation is disabled globally, just show the card without the 3D wrapper physics if needed
            // But preserving structure is better, we just toggle the classes immediately
            
            cardsHtml += `
                <div class="tarot-card-wrapper" style="margin: 0 auto; width: 100%; max-width: 260px; min-width: 120px; display: flex; flex-direction: column; align-items: center;">
                    <div class="text-gold text-center mb-sm font-bold text-sm tracking-wider" style="opacity: 0.8; width: 100%;">
                        ${this._sanitize(item.position.name)}
                    </div>
                    <div class="tarot-card-scene" data-index="${index}" style="width: 100%;">
                        <div class="tarot-card ${animClass} ${flippedClass}">
                            <div class="tarot-card-face tarot-card-back" style="${backStyle}">
                                ${!backImgUrl ? '<div class="card-back-placeholder" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:3em; background: rgba(0,0,0,0.5);">🔮</div>' : ''}
                            </div>
                            <div class="tarot-card-face tarot-card-front" style="${frontStyle}; transform: rotateY(180deg) ${reversedTransform};">
                                ${!frontImgUrl ? `<div class="card-back-placeholder" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.5);"><span style="font-size: 2em">${c.number}</span></div>` : ''}
                                <div class="tarot-card-name truncate ${item.reversed ? 'text-danger' : 'text-gold'}" style="padding:4px 8px; ${item.reversed ? 'transform: rotateZ(180deg); bottom: auto; top: 0; border-radius: 6px 6px 0 0; background: rgba(0,0,0,0.85);' : ''}">
                                    ${this._sanitize(c.nameVi || c.name)} ${item.reversed ? '(Ngược)' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        // Determine Layout based on count
        let gridClass = 'grid-auto';
        if (drawnCards.length === 1) gridClass = 'flex justify-center';
        else if (drawnCards.length === 2) gridClass = 'grid-2';
        else if (drawnCards.length === 3) gridClass = 'grid-3';

        const html = `
            <div class="flex items-center justify-between mb-lg">
                <div class="flex items-center gap-sm cursor-pointer text-muted" id="btnEndReading">
                    <span class="text-lg">←</span> <span>Kết thúc</span>
                </div>
                <!-- Optional Save button if all flipped -->
                ${allFlipped ? `<button class="btn btn-sm btn-primary" id="btnSaveReading">Lưu Kết Quả</button>` : ''}
            </div>

            <div class="text-center mb-xl">
                <p class="text-sm text-muted">
                    ${allFlipped ? 'Chạm vào lá bài để xem giải nghĩa chi tiết.' : 'Chạm vào từng lá bài để lật mở.'}
                </p>
            </div>

            <div class="${gridClass} gap-lg" id="drawBoard">
                ${cardsHtml}
            </div>
        `;

        this._container.innerHTML = html;
        this._attachReadingEvents();
    },

    _attachReadingEvents() {
        document.getElementById('btnEndReading')?.addEventListener('click', async () => {
            const yes = await Modal.confirm("Kết thúc Trải bài", "Những lá bài chưa kịp Lưu sẽ bị mất. Bạn chắc chắn chứ?");
            if (yes) {
               this._state.currentView = 'setup';
               this._renderMainView();
            }
        });

        // Save Reading action
        document.getElementById('btnSaveReading')?.addEventListener('click', async () => {
            try {
                Loading.show("Đang lưu trải bài...");
                const reading = {
                    id: generateId(),
                    deckId: this._state.selectedDeck.id,
                    spreadId: this._state.selectedSpread.id,
                    cards: this._state.drawnCards.map(d => ({
                        cardId: d.card.id,
                        reversed: d.reversed,
                        positionId: d.position.id
                    })),
                    notes: '',
                    createdAt: Date.now()
                };
                await Store.set(STORES.READINGS, reading);
                await Store.addToSyncQueue('create', STORES.READINGS, reading.id, reading);
                
                Toast.success("Lưu trải bài thành công");
            } catch(e) {
                console.error(e);
                Toast.error("Lỗi khi lưu");
            } finally {
                Loading.hide();
            }
        });

        // Click Event for Cards
        const cardElements = document.querySelectorAll('.tarot-card-scene');
        cardElements.forEach(el => {
            el.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                const item = this._state.drawnCards[index];

                if (!item.flipped) {
                    // FLIP OVER
                    item.flipped = true;
                    // Trigger reflow/re-render to show animation
                    if (App.settings.animationsEnabled) {
                        const internalCard = e.currentTarget.querySelector('.tarot-card');
                        internalCard.classList.add('flipped');
                        
                        // Check if all flipped to reveal save button
                        const allFlipped = this._state.drawnCards.every(c => c.flipped);
                        if (allFlipped) {
                            setTimeout(() => this._renderMainView(), 1000); // re-render to show layout changes
                        }
                    } else {
                        this._renderMainView();
                    }
                } else {
                    // ALREADY FLIPPED => SHOW DETAILS MODAL
                    this._showCardInterpretation(item);
                }
            });
        });
    },

    _showCardInterpretation(item) {
        const c = item.card;
        
        let detailsHtml = '';
        if (item.reversed) {
            detailsHtml = c.reversedDetails ? `<p>${this._sanitize(c.reversedDetails).replace(/\n/g, '<br>')}</p>` : `<p class="text-muted italic">Đang cập nhật ý nghĩa (Ngược)...</p>`;
        } else {
            detailsHtml = c.details ? `<p>${this._sanitize(c.details).replace(/\n/g, '<br>')}</p>` : `<p class="text-muted italic">Đang cập nhật ý nghĩa (Xuôi)...</p>`;
        }

        const keywords = (c.keywordsVi && c.keywordsVi.length > 0) ? c.keywordsVi : c.keywords;
        const keywordsHtml = keywords && keywords.length > 0 ? 
            `<div class="flex flex-wrap gap-xs mb-md">
                ${keywords.map(kw => `<span class="badge badge-gold" style="background: rgba(212, 165, 116, 0.2);">${this._sanitize(kw)}</span>`).join('')}
            </div>` : '';

        const title = `${this._sanitize(c.nameVi || c.name)} ${item.reversed ? '<span class="text-danger">(Ngược)</span>' : ''}`;

        const bodyHtml = `
            <div class="mb-md p-sm rounded bg-black bg-opacity-40 border border-gold" style="border-width: 1px;">
                <p class="text-sm font-bold text-gold mb-xs">Vị trí: ${this._sanitize(item.position.name)}</p>
                <p class="text-xs text-muted">${this._sanitize(item.position.description || '')}</p>
            </div>
            
            ${keywordsHtml}
            <div class="text-sm" style="line-height: 1.6; max-height: 50vh; overflow-y: auto; padding-right: 8px;">
                ${detailsHtml}
                
                ${c.companionText ? `
                    <div class="divider"></div>
                    <h4 class="text-xs text-gold uppercase mb-sm">Sách Hướng Dẫn Gốc (Companion)</h4>
                    <p class="text-xs text-muted" style="font-family: monospace;">${this._sanitize(c.companionText).replace(/\n/g, '<br>')}</p>
                ` : ''}
            </div>
        `;

        Modal.open({
            title: title,
            body: bodyHtml
        });
    },

    _sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

window.CardReader = CardReader;
