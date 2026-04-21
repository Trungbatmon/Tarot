/* =============================================
   Module Name — Companion Importer
   UI to bulk-paste or PDF upload Companion Book text.
   Uses AI to segment and assign text to individual cards.
   Includes PDF parser for text and image extraction.
   ============================================= */

const CompanionImporter = {
    _deckId: null,
    _deck: null,
    _cards: [],
    _extractedImages: [], // {url, width, height, id}

    /**
     * Open the Companion Importer Modal for a deck
     */
    async openForDeck(deckId) {
        this._deckId = deckId;
        
        const deck = await Store.get(STORES.DECKS, deckId);
        if (!deck) return Toast.error("Không tìm thấy bộ bài");

        this._deck = deck;
        this._cards = await Store.query(STORES.CARDS, 'deckId', deckId);
        this._extractedImages = [];

        const bodyHtml = `
            <div class="tabs-header mb-md flex gap-sm" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
                <button id="ciTabTxt" class="nav-tab active" style="flex:1;">Phân tích Sách/PDF</button>
                <button id="ciTabImg" class="nav-tab" style="flex:1;">Ảnh Trích Xuất <span id="ciImgBadge"></span></button>
            </div>

            <!-- TAB TEXT -->
            <div id="ciViewTxt" class="tab-content" style="display:block;">
                <p class="text-sm text-muted mb-md">
                    Dán nội dung sách hướng dẫn hoặc <strong>Tải lên file PDF</strong> nguyên quyển để bóc tách dữ liệu vào bộ <strong>${this._sanitize(deck.name)}</strong>.
                </p>
                
                <div class="form-group mb-md">
                    <input type="file" id="ciPdfFile" accept="application/pdf" class="form-input text-sm p-sm" style="background: rgba(255,255,255,0.05); cursor:pointer;">
                </div>

                <div class="badge badge-warning p-sm text-xs mb-sm block">
                    Lưu ý: Nếu tải lên PDF dài, hệ thống sẽ tự chia nhỏ văn bản và chạy AI dưới dạng chuỗi nối tiếp. Ảnh nếu có sẽ tự chuyển sang Tab bên cạnh.
                </div>
                
                <textarea id="companionRawText" class="form-textarea mb-md" style="height: 200px; font-family: monospace; font-size: 13px;" placeholder="Dán nội dung văn bản sách trực tiếp vào đây nếu không dùng PDF..."></textarea>
                
                <div id="ciProgressWrapper" class="mb-md" style="display:none;">
                    <div class="flex justify-between text-xs text-gold mb-xs">
                        <span id="ciProgressLabel">Đang xử lý...</span>
                        <span id="ciProgressPercent" class="font-bold">0%</span>
                    </div>
                    <div class="progress-bar mb-xs" style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                        <div id="ciProgressBar" class="bg-gold" style="height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <button id="btnProcessCompanion" class="btn btn-primary w-full relative">
                    <span class="icon">✨</span> Phân tích bằng AI
                </button>
            </div>

            <!-- TAB IMAGES -->
            <div id="ciViewImg" class="tab-content" style="display:none;">
                <p class="text-sm text-muted mb-md">
                    Các hình ảnh trích xuất từ PDF sẽ hiển thị ở đây. Chọn lá bài tương ứng rồi ấn "Lưu ảnh".
                </p>
                <div id="ciImageGallery" class="grid-2 gap-sm" style="max-height: 480px; overflow-y: auto; overflow-x: hidden; padding-right: 5px;">
                    <p class="text-sm text-muted italic col-span-2 text-center mt-xl">Chưa có ảnh nào. Cần upload file PDF trước.</p>
                </div>
            </div>
        `;

        Modal.open({
            title: `Import Companion Book`,
            body: bodyHtml
        });

        setTimeout(() => this._attachEvents(), 100);
    },

    _attachEvents() {
        // Tab switching
        const tabTxt = document.getElementById('ciTabTxt');
        const tabImg = document.getElementById('ciTabImg');
        const viewTxt = document.getElementById('ciViewTxt');
        const viewImg = document.getElementById('ciViewImg');

        tabTxt?.addEventListener('click', () => {
            tabTxt.classList.add('active'); tabImg.classList.remove('active');
            viewTxt.style.display = 'block'; viewImg.style.display = 'none';
        });

        tabImg?.addEventListener('click', () => {
            tabImg.classList.add('active'); tabTxt.classList.remove('active');
            viewImg.style.display = 'block'; viewTxt.style.display = 'none';
        });

        // PDF File parsing
        document.getElementById('ciPdfFile')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                Loading.show("Đang tải công cụ đọc PDF...");
                await this._loadPdfJs();
                Loading.show("Đang giải nén Text và Ảnh từ PDF...");
                await this._processPdf(file);
            } catch (err) {
                console.error(err);
                Toast.error("Lỗi đọc PDF: " + err.message);
            } finally {
                Loading.hide();
            }
        });

        // Process button
        document.getElementById('btnProcessCompanion')?.addEventListener('click', async () => {
            const rawText = document.getElementById('companionRawText').value.trim();
            if (!rawText) return Toast.error("Vui lòng dán văn bản hoặc chọn file PDF.");
            
            if (!AIService.isGeminiAvailable()) {
                return Toast.error("Vui lòng cấu hình Gemini API Key trước khi dùng AI.");
            }

            await this._runBulkAiPipeline(rawText);
        });
    },

    async _loadPdfJs() {
        if (window.pdfjsLib) return;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = () => reject(new Error('Khởi tạo thư viện đọc PDF thất bại. Vui lòng kiểm tra mạng.'));
            document.head.appendChild(script);
        });
    },

    async _processPdf(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        
        let fullText = "";
        this._extractedImages = [];
        
        for (let i = 1; i <= totalPages; i++) {
            if (i % 5 === 0) Loading.show(`Đang quét trang ${i}/${totalPages}...`);

            try {
                const page = await pdf.getPage(i);
                
                // Text Extraction
                const textContent = await page.getTextContent();
                let pageText = textContent.items.map(s => s.str).join(' ');
                
                // Fix basic wrapping issues
                pageText = pageText.replace(/([a-z])- ([a-z])/ig, "$1$2"); 
                fullText += pageText + "\n\n";
                
                // Try Image Extraction using operator list
                await this._extractImagesFromPage(page, i);

            } catch (e) {
                console.warn("Lỗi đọc trang PDF số " + i, e);
            }
        }
        
        document.getElementById('companionRawText').value = fullText;
        Toast.success(`Trích xuất xong ${totalPages} trang. Tìm thấy ${this._extractedImages.length} hình ảnh.`);
        this._renderImageGallery();
        document.getElementById('ciImgBadge').innerText = `(${this._extractedImages.length})`;
    },

    async _extractImagesFromPage(page, pageNum) {
        try {
            const ops = await page.getOperatorList();
            
            for (let j = 0; j < ops.fnArray.length; j++) {
                if (ops.fnArray[j] === window.pdfjsLib.OPS.paintImageXObject || ops.fnArray[j] === window.pdfjsLib.OPS.paintJpegXObject) {
                    const objId = ops.argsArray[j][0];
                    page.objs.get(objId, (img) => {
                        // Skip tiny junk vector fragments
                        if (!img || img.width < 120 || img.height < 120) return;
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        
                        try {
                            if (img.bitmap) {
                                ctx.drawImage(img.bitmap, 0, 0);
                            } else if (img.data) {
                                const imageData = new ImageData(img.width, img.height);
                                if (img.data.length === img.width * img.height * 3) {
                                    // Make RGBA from RGB
                                    for (let i = 0, k = 0; i < img.data.length; i += 3, k += 4) {
                                        imageData.data[k] = img.data[i];
                                        imageData.data[k+1] = img.data[i+1];
                                        imageData.data[k+2] = img.data[i+2];
                                        imageData.data[k+3] = 255;
                                    }
                                } else if (img.data.length === img.width * img.height * 4) {
                                    // Direct RGBA transfer
                                    imageData.data.set(new Uint8ClampedArray(img.data));
                                } else {
                                    return; // Unknown format
                                }
                                ctx.putImageData(imageData, 0, 0);
                            } else {
                                return;
                            }
                            
                            canvas.toBlob((blob) => {
                                 const url = URL.createObjectURL(blob);
                                 this._extractedImages.push({
                                      id: `img_${pageNum}_${j}`,
                                      url: url,
                                      blob: blob,
                                      width: img.width,
                                      height: img.height
                                 });
                                 // Auto trigger render if gallery is open
                                 if (document.getElementById('ciViewImg').style.display === 'block') {
                                     this._renderImageGallery();
                                 }
                            }, 'image/jpeg', 0.85);

                        } catch(canvasErr) {
                            console.warn("Lỗi Canvas trang " + pageNum, canvasErr);
                        }
                    });
                }
            }
        } catch(e) { console.warn("Lỗi operator trang", e); }
    },

    _renderImageGallery() {
        const container = document.getElementById('ciImageGallery');
        if (!container) return;
        
        if (this._extractedImages.length === 0) {
            container.innerHTML = `<p class="text-sm text-muted italic col-span-2 text-center mt-xl">Không tìm thấy hoặc không có hình ảnh nào đủ lớn.</p>`;
            return;
        }

        const optionsHtml = this._cards.map(c => `<option value="${c.id}">${this._sanitize(c.nameVi || c.name)}</option>`).join('');

        container.innerHTML = this._extractedImages.map((img, idx) => `
            <div class="card p-sm bg-black border border-gold" style="display:flex; flex-direction:column; gap:8px; border-width:1px; border-radius: var(--radius-md);">
                <div style="width: 100%; height: 160px; background: #0a0a1a; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <img src="${img.url}" style="max-height: 100%; max-width: 100%; object-fit: contain; cursor: pointer;" onclick="window.open('${img.url}')" title="Nhấn để xem ảnh gốc">
                </div>
                <select class="form-select text-xs ci-img-assign" data-idx="${idx}">
                    <option value="">-- Chọn lá bài gán --</option>
                    ${optionsHtml}
                </select>
                <button class="btn btn-sm btn-secondary btn-assign-img" data-idx="${idx}">Lưu Ảnh</button>
            </div>
        `).join('');

        // Attach assign events
        container.querySelectorAll('.btn-assign-img').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idx = parseInt(e.currentTarget.dataset.idx);
                const selectElement = container.querySelector(`.ci-img-assign[data-idx="${idx}"]`);
                const cardId = selectElement.value;
                if (!cardId) return Toast.info("Vui lòng chọn một tên lá bài từ menu.");
                
                try {
                    Loading.show("Đang lưu ảnh...");
                    const card = await Store.get(STORES.CARDS, cardId); // fresh copy
                    const imgObj = this._extractedImages[idx];
                    
                    const file = new File([imgObj.blob], `extracted_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    card.image = file;
                    card.imageUrl = null; // Clear online url if exist
                    card.imageDownloaded = true;
                    
                    await Store.set(STORES.CARDS, card);
                    await Store.addToSyncQueue('update', STORES.CARDS, card.id, card);
                    
                    // remove from array safely 
                    this._extractedImages.splice(idx, 1);
                    this._renderImageGallery();
                    
                    Toast.success(`Đã gắn ảnh vào ${card.nameVi || card.name} thành công!`);
                } catch(err) {
                    console.error(err);
                    Toast.error("Lỗi khi lưu ảnh vào IndexedDB");
                } finally {
                    Loading.hide();
                }
            });
        });
    },

    async _runBulkAiPipeline(rawText) {
        // Chunk Engine
        const MAX_CHUNK = 3600; // Optimal safe limit
        const chunks = [];
        let pText = rawText;
        
        while(pText.length > 0) {
            if (pText.length <= MAX_CHUNK) {
                chunks.push(pText);
                break;
            }
            
            // Auto layout breaks (double newline, newline, dot)
            let breakIdx = pText.lastIndexOf('\n\n', MAX_CHUNK);
            if (breakIdx === -1 || breakIdx < MAX_CHUNK * 0.6) breakIdx = pText.lastIndexOf('\n', MAX_CHUNK);
            if (breakIdx === -1 || breakIdx < MAX_CHUNK * 0.6) breakIdx = pText.lastIndexOf('. ', MAX_CHUNK);
            if (breakIdx === -1 || breakIdx < MAX_CHUNK * 0.6) breakIdx = MAX_CHUNK; 
            
            chunks.push(pText.substring(0, breakIdx));
            pText = pText.substring(breakIdx).trim();
        }

        const btn = document.getElementById('btnProcessCompanion');
        const progressWrapper = document.getElementById('ciProgressWrapper');
        const progressBar = document.getElementById('ciProgressBar');
        const progressLabel = document.getElementById('ciProgressLabel');
        const progressPct = document.getElementById('ciProgressPercent');

        btn.disabled = true;
        progressWrapper.style.display = 'block';
        
        const cardNames = this._cards.map(c => c.name);
        let totalMatched = 0;
        
        for (let i = 0; i < chunks.length; i++) {
            const percent = Math.round((i / chunks.length) * 100);
            progressBar.style.width = percent + '%';
            progressPct.textContent = percent + '%';
            progressLabel.textContent = `Đang phân tích phần ${i+1}/${chunks.length}...`;
            
            try {
                // Bulk AI Call
                const mapResult = await AIService.parseCompanionBulk(this._deck.name, cardNames, chunks[i]);
                
                // Save loops
                for (const [cName, text] of Object.entries(mapResult)) {
                    if (text && text.trim().length > 10) {
                        const targetCard = this._cards.find(c => c.name.toLowerCase() === cName.toLowerCase());
                        if (targetCard) {
                            const oldText = targetCard.companionText || '';
                            targetCard.companionText = (oldText + "\n\n" + text.trim()).trim();
                            await Store.set(STORES.CARDS, targetCard);
                            await Store.addToSyncQueue('update', STORES.CARDS, targetCard.id, targetCard);
                            totalMatched++;
                        }
                    }
                }
            } catch(e) {
                console.error("Chunk pipeline error:", e);
                Toast.error(`Phần ${i+1}: Lỗi mạng / timeout. Cố gắng tiếp tục tiếp phần sau.`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        progressBar.style.width = '100%';
        progressPct.textContent = '100%';
        progressLabel.textContent = "Hoàn tất giải trình!";
        
        Toast.success(`Đọc xong! Đã thực hiện ${totalMatched} kết nối mô tả vào thẻ bài.`);
        btn.disabled = false;
        
        setTimeout(() => {
            if (typeof DeckManager !== 'undefined' && DeckManager._deckId === this._deckId) {
                 DeckManager._renderDeckDetail();
            }
        }, 1500);
    },

    _sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

window.CompanionImporter = CompanionImporter;
