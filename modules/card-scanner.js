/* =============================================
   Module Name — Card Scanner
   Handles Camera capture processing, Auto-Crop 
   fallback logic, and connects to Cloudinary
   via AIService for image enhancements.
   ============================================= */

const CardScanner = {
    // DOM bindings for the active modal session
    _modalContent: null,
    _selectedCardId: null,
    _onSuccess: null,

    // File input fallback in case `getUserMedia` fails or is not preferred 
    // due to iOS/Android constraints within PWAs sometimes
    _fileInput: null, 

    /**
     * Entry point to open the Card Scanner modal
     * @param {string} cardId ID of the card being scanned
     * @param {Function} onSuccess Callback triggered after successful save
     */
    async openForCard(cardId, onSuccess) {
        this._selectedCardId = cardId;
        this._onSuccess = onSuccess;

        const card = await Store.get(STORES.CARDS, cardId);
        if (!card) return Toast.error("Không tìm thấy thông tin lá bài.");

        const bodyHtml = `
            <div class="card-scanner-container text-center">
                <p class="text-muted mb-lg">Đang scan ảnh cho lá: <strong>${this._sanitize(card.name)}</strong></p>

                <div id="scannerPreviewArea" class="mb-lg" style="display: none;">
                    <img id="scannerPreviewImg" class="rounded max-h-64 object-contain shadow-gold mx-auto" src="" alt="Preview">
                </div>

                <div class="grid-2 gap-md" id="scannerActionButtons">
                    <!-- Use standard input file type=file accept=image/* capture="environment" for best mobile compatibility -->
                    <label id="btnCapturePhoto" class="btn btn-primary w-full relative">
                        <span class="icon">📷</span> Chụp ảnh
                        <input type="file" id="scannerFileInput" accept="image/*" capture="environment" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    </label>
                    <label id="btnUploadGallery" class="btn btn-secondary w-full relative">
                        <span class="icon">🖼️</span> Chọn ngẫu nhiên (Thư viện)
                        <input type="file" id="scannerGalleryInput" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    </label>
                </div>
                
                <div id="scannerProcessOptions" class="mt-lg" style="display: none;">
                    <h4 class="text-sm text-gold mb-sm">Xử lý hình ảnh</h4>
                    <div class="flex gap-sm justify-center mb-md">
                        <button id="btnEnhanceCloudinary" class="btn btn-secondary">
                            <span class="icon">✨</span> AI Tự động Crop & Nâng Cấp
                        </button>
                    </div>
                     <p class="text-xs text-muted">Hoặc bạn có thể tự crop bên ngoài rồi chỉ cần Upload lại ảnh đã cắt đẹp vào phần Thư viện.</p>
                     
                     <div class="divider"></div>
                     <div class="flex justify-between mt-sm">
                         <button id="btnScannerRetake" class="btn btn-secondary">Thử ảnh khác</button>
                         <button id="btnScannerSaveDirect" class="btn btn-primary">Lưu ảnh này (Nguyên bản)</button>
                     </div>
                </div>
            </div>
        `;

        Modal.open({
            title: `Card Scanner`,
            body: bodyHtml,
            onClose: () => {
                this._cleanup();
            }
        });

        setTimeout(() => this._attachEvents(), 100);
    },

    /**
     * Attach events to the modal buttons
     */
    _attachEvents() {
        const fileInput = document.getElementById('scannerFileInput');
        const galleryInput = document.getElementById('scannerGalleryInput');
        const previewImg = document.getElementById('scannerPreviewImg');
        const previewArea = document.getElementById('scannerPreviewArea');
        const actionArea = document.getElementById('scannerActionButtons');
        const processArea = document.getElementById('scannerProcessOptions');
        
        let currentFile = null;

        const handleFileSelect = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            currentFile = file;
            const url = URL.createObjectURL(file);
            previewImg.src = url;
            
            previewArea.style.display = 'block';
            actionArea.style.display = 'none';
            processArea.style.display = 'block';
            
            // Clean up old object URLs to prevent memory leaks if user selects multiple times
            previewImg.onload = () => URL.revokeObjectURL(url);
        };

        fileInput?.addEventListener('change', handleFileSelect);
        galleryInput?.addEventListener('change', handleFileSelect);

        document.getElementById('btnScannerRetake')?.addEventListener('click', () => {
            currentFile = null;
            previewImg.src = '';
            previewArea.style.display = 'none';
            processArea.style.display = 'none';
            actionArea.style.display = 'grid'; // Reset actions
            if(fileInput) fileInput.value = '';
            if(galleryInput) galleryInput.value = '';
        });

        // -----------------------------------------
        // Direct Save (No AI Enhancement)
        // -----------------------------------------
        document.getElementById('btnScannerSaveDirect')?.addEventListener('click', async () => {
            if (!currentFile) return Toast.error("Chưa chọn hình ảnh.");
            
            try {
                Loading.show("Đang lưu hình nguyên bản...");
                await this._saveFileToCard(currentFile, null);
                Toast.success("Lưu thành công.");
                Modal.close();
                if (this._onSuccess) this._onSuccess();
            } catch (err) {
                console.error(err);
                Toast.error("Lỗi khi lưu ảnh: " + err.message);
            } finally {
                Loading.hide();
            }
        });

        // -----------------------------------------
        // Cloudinary AI Enhancement
        // -----------------------------------------
        document.getElementById('btnEnhanceCloudinary')?.addEventListener('click', async () => {
            if (!currentFile) return Toast.error("Chưa chọn hình ảnh.");

            try {
                Loading.show("Vui lòng chờ. AI đang crop và làm nét hình ảnh (có thể mất 5-10s)...");
                const enhancedUrl = await AIService.enhanceImage(currentFile);
                
                // Fetch the processed image back from Cloudinary as a Blob to store locally for offline mode
                const response = await fetch(enhancedUrl);
                const blob = await response.blob();
                
                // Create a File object from the blob structure
                const processedFile = new File([blob], "enhanced_card.webp", { type: 'image/webp' });

                await this._saveFileToCard(processedFile, enhancedUrl);
                Toast.success("Đã nạp AI tự động Crop thành công.");
                Modal.close();
                if (this._onSuccess) this._onSuccess();
            } catch (err) {
                console.error(err);
                Toast.error("Lỗi AI Xử lý ảnh: " + err.message);
            } finally {
                Loading.hide();
            }
        });
    },

    /**
     * Save the processed (or raw) file to the current Card ID
     * @param {File|Blob} file 
     * @param {string|null} cloudUrl (Optional) the Cloudinary URL if processed
     */
    async _saveFileToCard(file, cloudUrl = null) {
        if (!this._selectedCardId) throw new Error("Missing Card ID");
        
        const card = await Store.get(STORES.CARDS, this._selectedCardId);
        if (!card) throw new Error("Card record missing during save");

        // Compress or wrap logic here if Needed later. 
        // Cloudinary already returns webp optimized.
        
        card.image = file; // Save raw blob
        card.imageUrl = cloudUrl; // Save URL if available
        card.imageDownloaded = true; // Local blob is ready

        await Store.set(STORES.CARDS, card);
        await Store.addToSyncQueue('update', STORES.CARDS, card.id, card);
    },

    _cleanup() {
        this._selectedCardId = null;
        this._onSuccess = null;
    },

    _sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

window.CardScanner = CardScanner;
