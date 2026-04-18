/* =============================================
   Module Name — Companion Importer
   UI to bulk-paste Companion Book text and use AI
   to segment and assign text to individual cards.
   ============================================= */

const CompanionImporter = {
    _deckId: null,

    /**
     * Open the Companion Importer Modal for a deck
     * @param {string} deckId 
     */
    async openForDeck(deckId) {
        this._deckId = deckId;
        
        const deck = await Store.get(STORES.DECKS, deckId);
        if (!deck) return Toast.error("Không tìm thấy bộ bài");

        const bodyHtml = `
            <div class="mb-lg">
                <p class="text-sm text-muted mb-md">
                    Dán nội dung sách hướng dẫn (Companion Book) phần mô tả các lá bài vào đây. 
                    AI sẽ tự động đọc, nhận diện tên lá bài và chia nhỏ để gắn vào từng lá tương ứng trong bộ <strong>${this._sanitize(deck.name)}</strong>.
                </p>
                
                <div class="badge badge-warning p-sm text-xs mb-sm block">
                    Lưu ý: Vì giới hạn bộ nhớ AI, mỗi lần chỉ nên dán nội dung của khoảng 10-15 lá bài (khoảng 3000-4000 chữ).
                </div>
                
                <textarea id="companionRawText" class="form-textarea" style="height: 250px; font-family: monospace; font-size: 13px;" placeholder="Dán nội dung sách vào đây..."></textarea>
            </div>

            <button id="btnProcessCompanion" class="btn btn-primary w-full relative">
                <span class="icon">✨</span> Phân tích bằng AI
            </button>
        `;

        Modal.open({
            title: `Import Sách Hướng Dẫn`,
            body: bodyHtml
        });

        setTimeout(() => this._attachEvents(), 100);
    },

    /**
     * Attach events to the modal buttons
     */
    _attachEvents() {
        document.getElementById('btnProcessCompanion')?.addEventListener('click', async () => {
            const rawText = document.getElementById('companionRawText').value.trim();
            if (!rawText) return Toast.error("Vui lòng dán nội dung sách trước.");
            
            if (!AIService.isGeminiAvailable()) {
                return Toast.error("Cần có cấu hình Gemini API Key (Cài đặt) để chạy AI.");
            }

            try {
                Loading.show("AI đang đọc sách (10-20s)...");
                
                // Fetch info
                const deck = await Store.get(STORES.DECKS, this._deckId);
                const cards = await Store.query(STORES.CARDS, 'deckId', this._deckId);
                if (cards.length === 0) throw new Error("Bộ bài này chưa có lá bài nào.");

                // Process in 1 shot for now, letting AI search among all card names
                const cardNames = cards.map(c => c.name);
                const mapResult = await AIService.parseCompanionBulk(deck.name, cardNames, rawText);

                // Update cards
                let matchCount = 0;
                for (const [cName, text] of Object.entries(mapResult)) {
                    if (text && text.trim().length > 10) {
                        const targetCard = cards.find(c => c.name.toLowerCase() === cName.toLowerCase());
                        if (targetCard) {
                            // Append or replace. Let's append for safety
                            const oldText = targetCard.companionText || '';
                            targetCard.companionText = (oldText + "\n\n" + text.trim()).trim();
                            await Store.set(STORES.CARDS, targetCard);
                            await Store.addToSyncQueue('update', STORES.CARDS, targetCard.id, targetCard);
                            matchCount++;
                        }
                    }
                }

                Toast.success(`Đã nhận diện & cập nhật nội dung cho ${matchCount} lá bài!`);
                Modal.close();
                
            } catch (err) {
                console.error(err);
                Toast.error(err.message);
            } finally {
                Loading.hide();
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

window.CompanionImporter = CompanionImporter;
