/* =============================================
   Module Name — Spread Builder
   Manages Tarot Spreads (list of reading templates)
   allows creating custom positions.
   ============================================= */

const SpreadBuilder = {
    _container: null,
    _state: {
        currentView: 'list', // list, create
        spreads: [],
        editingSpread: null
    },

    // Default Spreads to inject if DB is empty
    PRESETS: [
        {
            id: 'preset_1_card',
            name: 'Luận 1 Lá - Thông điệp trong ngày',
            description: 'Rút 1 lá bài duy nhất để lấy thông điệp tổng quan hoặc trả lời cho một câu hỏi Yes/No nhanh gọn.',
            category: 'all',
            isPreset: true,
            positions: [
                { id: 1, name: 'Thông điệp', description: 'Câu trả lời hoặc lời khuyên tổng quan.' }
            ]
        },
        {
            id: 'preset_3_time',
            name: 'Trải bài Thời Gian (3 Lá)',
            description: 'Phân tích dòng chảy của một sự việc từ Quá khứ, qua Hiện tại và dự phóng Tương lai.',
            category: 'all',
            isPreset: true,
            positions: [
                { id: 1, name: 'Quá khứ', description: 'Nguyên nhân gốc rễ, những gì đã xảy ra ảnh hưởng đến hiện tại.' },
                { id: 2, name: 'Hiện tại', description: 'Tình trạng hiện thời, vấn đề đang phải đối mặt trực tiếp.' },
                { id: 3, name: 'Tương lai', description: 'Kết quả có thể xảy ra nếu xu hướng hiện tại tiếp diễn.' }
            ]
        },
        {
            id: 'preset_3_love',
            name: 'Trải bài Tình Yêu (3 Lá)',
            description: 'Khám phá sự tương tác giữa hai người trong một mối quan hệ.',
            category: 'tarot',
            isPreset: true,
            positions: [
                { id: 1, name: 'Bạn', description: 'Cảm xúc và năng lượng của bạn trong mối quan hệ này.' },
                { id: 2, name: 'Người ấy', description: 'Cảm xúc và năng lượng của đối phương.' },
                { id: 3, name: 'Mối quan hệ', description: 'Tình trạng hiện tại của kết nối giữa hai người.' }
            ]
        },
        {
            id: 'preset_celtic',
            name: 'Trải bài Celtic Cross (10 Lá)',
            description: 'Trải bài cổ điển và mạnh mẽ giúp phân tích sâu sắc mọi khía cạnh của một vấn đề phức tạp.',
            category: 'tarot',
            isPreset: true,
            positions: [
                { id: 1, name: 'Trái tim vấn đề', description: 'Tình hình hiện tại, cốt lõi vấn đề.' },
                { id: 2, name: 'Lực cản/Thách thức', description: 'Điều đang ngăn cản hoặc hỗ trợ (bắt chéo lá 1).' },
                { id: 3, name: 'Nền tảng vô thức', description: 'Gốc rễ sâu bên trong, những gì nằm dưới bề mặt.' },
                { id: 4, name: 'Quá khứ gần', description: 'Sự việc vừa xảy ra và đang phai nhạt dần.' },
                { id: 5, name: 'Tiềm năng', description: 'Mục tiêu ngầm định, điều có thể đạt được.' },
                { id: 6, name: 'Tương lai gần', description: 'Sự kiện sắp diễn ra trong thời gian ngắn tới.' },
                { id: 7, name: 'Góc nhìn bản thân', description: 'Bạn đang nhìn nhận bản thân và năng lượng của mình ra sao.' },
                { id: 8, name: 'Môi trường xung quanh', description: 'Yếu tố bên ngoài, người khác đánh giá hoặc ảnh hưởng đến bạn.' },
                { id: 9, name: 'Nguyện vọng / Nỗi sợ', description: 'Điều bạn đang mong muốn diễn ra nhất hoặc sợ hãi nhất.' },
                { id: 10, name: 'Kết quả chung cuộc', description: 'Đích đến cuối cùng nếu mọi thứ tiếp diễn theo quỹ đạo này.' }
            ]
        }
    ],

    async render() {
        this._container = document.getElementById('viewSpreads');
        if (!this._container) return;
        
        await this._loadData();
        this._renderMainView();
    },

    async _loadData() {
        let stored = await Store.getAll(STORES.SPREADS);
        
        // Populate defaults if completely empty
        if (stored.length === 0) {
            for (const preset of this.PRESETS) {
                await Store.set(STORES.SPREADS, preset);
            }
            stored = this.PRESETS;
        }

        this._state.spreads = stored;
    },

    _renderMainView() {
        if (this._state.currentView === 'list') {
            this._renderListView();
        } else if (this._state.currentView === 'create') {
            this._renderCreateForm();
        }
    },

    // ==========================================
    // LIST VIEW
    // ==========================================
    _renderListView() {
        const presets = this._state.spreads.filter(s => s.isPreset);
        const customs = this._state.spreads.filter(s => !s.isPreset);

        const renderSpreads = (list) => {
            if (list.length === 0) return '<p class="text-muted text-sm italic">Chưa có sơ đồ trải bài nào.</p>';
            
            return list.map(spread => `
                <div class="card mb-md relative">
                    ${spread.isPreset ? `<span class="badge badge-gold absolute top-2 right-2" style="position:absolute; top:12px; right:12px;">Mặc định</span>` : ''}
                    <h4 class="text-md font-bold mb-xs text-gold">${this._sanitize(spread.name)}</h4>
                    <p class="text-sm text-muted mb-sm">${this._sanitize(spread.description)}</p>
                    <div class="text-xs font-bold" style="color: var(--primary);">
                        Gồm: ${spread.positions.length} vị trí (lá bài)
                    </div>
                    
                    ${!spread.isPreset ? `
                        <div class="flex gap-sm mt-md">
                            <button class="btn btn-secondary btn-sm" onclick="Toast.info('Chức năng Edit sẽ mở ở các phase sau')">Sửa</button>
                            <button class="btn btn-danger btn-sm ml-auto btn-del-spread" data-id="${spread.id}">Xóa</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        };

        const html = `
            <div class="flex justify-between items-center mb-xl">
                <h2 class="section-title mb-0" style="margin-bottom: 0;">Trải Bài</h2>
                <button id="btnCreateSpread" class="btn btn-primary btn-sm">+ Tạo mới</button>
            </div>

            <p class="text-muted text-sm mb-lg">
                Sơ đồ trải bài (Spread) quy định mỗi lá bài được rút ra mang ý nghĩa gì. Bạn có thể tự tạo cấu trúc trải bài cho riêng mình.
            </p>

            <div class="mb-xl">
                <h3 class="section-subtitle mb-md">Sơ đồ có sẵn</h3>
                ${renderSpreads(presets)}
            </div>

            <div class="mb-xl">
                <h3 class="section-subtitle mb-md flex justify-between items-center">
                    Của bạn
                    <span class="badge bg-purple-900">${customs.length}</span>
                </h3>
                ${renderSpreads(customs)}
            </div>
        `;

        this._container.innerHTML = html;
        this._attachListEvents();
    },

    _attachListEvents() {
        document.getElementById('btnCreateSpread')?.addEventListener('click', () => {
            this._state.currentView = 'create';
            // Start fresh
            this._state.editingSpread = {
                name: '',
                description: '',
                positions: [
                    { id: Date.now(), name: '', description: '' }
                ]
            };
            this._renderMainView();
        });

        document.querySelectorAll('.btn-del-spread').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const yes = await Modal.confirm("Xóa Sơ đồ", "Bạn chắc chắn muốn xóa mẫu trải bài này?");
                if (yes) {
                    await Store.delete(STORES.SPREADS, id);
                    Toast.success("Đã xóa");
                    await this._loadData();
                    this._renderMainView();
                }
            });
        });
    },

    // ==========================================
    // CREATE/EDIT FORM
    // ==========================================
    _renderCreateForm() {
        let posHtml = '';
        this._state.editingSpread.positions.forEach((pos, index) => {
            posHtml += `
                <div class="card mb-sm relative pos-item" data-idx="${index}">
                    <div class="absolute" style="top: -12px; left: 16px; background: var(--bg-card); padding: 0 8px; font-weight: bold; font-family: var(--font-display); color: var(--gold); border-radius: 4px;">
                        Lá thứ ${index + 1}
                    </div>
                    
                    <button class="btn btn-icon text-danger absolute btn-del-pos" data-idx="${index}" title="Xóa vị trí này" style="top: 8px; right: 8px; width:30px; height:30px;">
                        ✕
                    </button>

                    <div class="mt-md form-group">
                        <label class="form-label text-xs">Tên/Chủ đề (VD: Quá khứ)</label>
                        <input type="text" class="form-input pos-name" value="${this._sanitize(pos.name)}" placeholder="Nhập tên vị trí...">
                    </div>
                    
                    <div class="form-group mb-0">
                        <label class="form-label text-xs">Mô tả (Không bắt buộc)</label>
                        <input type="text" class="form-input pos-desc" value="${this._sanitize(pos.description)}" placeholder="Giải thích ý nghĩa vị trí này...">
                    </div>
                </div>
            `;
        });

        const html = `
            <div class="flex items-center gap-sm mb-lg cursor-pointer text-muted" id="btnBackFromSpread">
                <span class="text-lg">←</span> <span>Quay lại</span>
            </div>

            <h2 class="section-title">Tạo Trải Bài Mới</h2>

            <div class="form-group">
                <label class="form-label" for="spreadName">Tên Trải Bài <span class="text-danger">*</span></label>
                <input type="text" id="spreadName" class="form-input" value="${this._sanitize(this._state.editingSpread.name)}" placeholder="VD: Bức tranh Ngã Ba Đường..." required>
            </div>

            <div class="form-group mb-xl">
                <label class="form-label" for="spreadDesc">Mô tả (Không bắt buộc)</label>
                <textarea id="spreadDesc" class="form-textarea" placeholder="Dùng khi nào, trả lời cho câu hỏi gì...">${this._sanitize(this._state.editingSpread.description)}</textarea>
            </div>

            <div class="flex justify-between items-center mb-md">
                <h3 class="section-subtitle mb-0">Cấu trúc Vị trí</h3>
                <button id="btnAddPosition" class="btn btn-secondary btn-sm">+ Thêm lá bài</button>
            </div>

            <div id="positionListContainer">
                ${posHtml}
            </div>

            <button id="btnSaveSpread" class="btn btn-success w-full mt-xl mb-3xl">Lưu Trải Bài</button>
        `;

        this._container.innerHTML = html;
        this._attachCreateEvents();
    },

    _syncFormToState() {
        this._state.editingSpread.name = document.getElementById('spreadName').value.trim();
        this._state.editingSpread.description = document.getElementById('spreadDesc').value.trim();
        
        const posItems = document.querySelectorAll('.pos-item');
        this._state.editingSpread.positions = Array.from(posItems).map(item => {
            return {
                id: item.dataset.idx, // loose id mapping
                name: item.querySelector('.pos-name').value.trim(),
                description: item.querySelector('.pos-desc').value.trim()
            };
        });
    },

    _attachCreateEvents() {
        document.getElementById('btnBackFromSpread')?.addEventListener('click', () => {
            this._state.currentView = 'list';
            this._renderMainView();
        });

        document.getElementById('btnAddPosition')?.addEventListener('click', () => {
            this._syncFormToState();
            this._state.editingSpread.positions.push({ id: Date.now(), name: '', description: '' });
            this._renderMainView(); // re-render to show new slot
            
            // Scroll to bottom
            setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 50);
        });

        document.querySelectorAll('.btn-del-pos').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this._syncFormToState();
                const idx = parseInt(e.currentTarget.dataset.idx);
                this._state.editingSpread.positions.splice(idx, 1);
                this._renderMainView();
            });
        });

        document.getElementById('btnSaveSpread')?.addEventListener('click', async () => {
            this._syncFormToState();
            const spread = this._state.editingSpread;
            
            if (!spread.name) return Toast.error("Vui lòng nhập tên sơ đồ trải bài.");
            if (spread.positions.length === 0) return Toast.error("Sơ đồ phải có ít nhất 1 lá bài.");
            
            const hasEmptyPos = spread.positions.some(p => !p.name);
            if (hasEmptyPos) return Toast.error("Vui lòng điền đủ Tên cho tất cả các vị trí lá bài.");

            try {
                Loading.show("Đang lưu...");
                
                const newSpread = {
                    id: spread.id || generateId(),
                    name: spread.name,
                    description: spread.description,
                    category: 'all', // Custom spread covers all
                    isPreset: false,
                    positions: spread.positions.map((p, i) => ({ id: i + 1, name: p.name, description: p.description })),
                    createdAt: Date.now()
                };

                await Store.set(STORES.SPREADS, newSpread);
                await Store.addToSyncQueue('create', STORES.SPREADS, newSpread.id, newSpread);
                
                Toast.success("Tạo sơ đồ thành công!");
                await this._loadData();
                this._state.currentView = 'list';
                this._renderMainView();
            } catch (err) {
                console.error(err);
                Toast.error("Lỗi khi lưu");
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

window.SpreadBuilder = SpreadBuilder;
