# Tarot PWA — Development Rules (STRICT) v2

> **These rules are NON-NEGOTIABLE.** Every AI assistant, developer, or contributor MUST follow them without exception. Violations will result in code rejection.

---

## 1. Architecture Rules

### 1.1 Tech Stack — NO EXCEPTIONS
- **ONLY** Vanilla JavaScript (ES6+), HTML5, CSS3
- **NO frameworks**: No React, Vue, Angular, Svelte, Next.js, etc.
- **NO build tools**: No Webpack, Vite, Rollup, Babel, TypeScript
- **NO CSS frameworks**: No Tailwind, Bootstrap, Bulma
- **NO package managers**: No npm, yarn, pnpm dependencies
- All code must run directly in the browser without compilation
- **ALLOWED CDNs**:
  - Dropbox JavaScript SDK (`dropbox-sdk-js`) — for cloud sync
  - Google APIs (`gapi`, `accounts.oauth2`) — for Google Drive fallback
  - GSAP (GreenSock) — for dealing/shuffle animations ONLY
  - Google Fonts — for typography

### 1.2 File Structure — STRICT
```
Tarot/
├── index.html              # SINGLE HTML file — shell only
├── app.js                  # Core: Store (IndexedDB), App controller, i18n, Toast, Modal
├── style.css               # ALL styles in ONE file
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── serve.ps1               # Dev server (HTTPS for camera)
├── CHECKPOINT.md           # Architecture doc (update after major changes)
├── RULES.md                # This file (NEVER modify without USER approval)
├── icons/                  # PWA icons
│   ├── icon-192.png
│   └── icon-512.png
└── modules/
    ├── ai-service.js        # AI abstraction (Gemini/OpenAI/Cloudinary)
    ├── settings.js          # Settings UI, API key management
    ├── deck-manager.js      # Deck CRUD, card list, card editor
    ├── card-scanner.js      # Camera capture, auto-crop, AI enhance
    ├── companion-importer.js # Companion import (photo/text/file)
    ├── card-reader.js       # Random draw, spread reading, flip animation
    ├── spread-builder.js    # Spread layout editor, drag-drop
    └── cloud-sync.js        # Dropbox (primary) + Google Drive (fallback) sync
```

### 1.3 Module Pattern
- Each module is a **single const object** (e.g., `const DeckManager = { ... }`)
- Modules communicate through the global `Store` and `App` objects
- Modules render their own HTML via `render()` method into their `<section>` container
- NO ES modules (`import`/`export`). All scripts loaded via `<script>` tags in `index.html`
- Script load order: `ai-service.js` → feature modules → `app.js` (last)

### 1.4 Data Storage — OFFLINE-FIRST
- **IndexedDB** as PRIMARY and ONLY local storage (database: `tarot_app_db`)
- ALL data + ALL image Blobs stored locally in IndexedDB
- All data access through `Store.get()` / `Store.set()` / `Store.delete()` / `Store.getAll()`
- NEVER access IndexedDB directly outside of `Store`
- Images:
  - **Local**: stored as Blob in IndexedDB (ALWAYS available offline)
  - **Cloud**: uploaded as WebP files to Dropbox/Google Drive
  - **Display priority**: IndexedDB Blob → cloud download → placeholder
  - **"Download All"**: user can bulk-download all cloud images to local IndexedDB
- Schema changes MUST be backward-compatible (migration scripts)
- **Sync queue** in `sync_queue` object store for offline mutations

### 1.5 Cloud Sync — Dropbox Priority
- **Dropbox API** is the PRIMARY cloud provider (user has Premium)
- **Google Drive API** is the FALLBACK (only if user explicitly selects)
- NEVER use both simultaneously
- All sync operations are **offline-first**: write IndexedDB → queue → sync when online
- Conflict resolution: **last-write-wins** (based on `updatedAt` timestamp)
- NEVER auto-delete cloud data without user confirmation
- Connection state indicator ALWAYS visible

### 1.6 API Key Security
- All API keys stored in IndexedDB `settings` store
- NEVER hard-code API keys in source files
- NEVER send API keys to any third-party besides their respective services
- Settings export MUST warn about API key inclusion
- OAuth tokens (Dropbox/Google) stored securely in IndexedDB, refreshed automatically

---

## 2. UI/UX Rules

### 2.1 Design System — MANDATORY (Mystic Tarot Theme)
- **Theme**: Dark mystical ONLY (no light mode)
- **Color Palette**:
  - Background: Deep midnight `#0a0a1a` → Dark purple `#1a0a2e` gradient
  - Primary accent: Mystic Gold `#d4a574` + Antique Gold `#c9a84c`
  - Secondary: Amethyst Purple `#7c3aed` + Deep Violet `#4c1d95`
  - Tertiary: Ethereal Teal `#14b8a6`
  - Text primary: Moonlight White `#e8e0d0`
  - Text muted: Parchment `#b8a88a`
  - Card glow: `rgba(212, 165, 116, 0.3)`
  - Danger: Blood Red `#dc2626`
  - Success: Emerald `#059669`
- **Fonts**:
  - Headings: **Cinzel Decorative** (mystical, ornamental)
  - Body: **Cormorant Garamond** (elegant serif)
  - UI/Labels: **Inter** (clean sans-serif)
  - All from Google Fonts
- **Effects**:
  - Glassmorphism panels: `backdrop-filter: blur(12px); background: rgba(10,10,26,0.7)`
  - Golden glow shadows on interactive elements
  - Star field / subtle particle background animation
  - Card shimmer sweep on hover
  - Gradient golden borders on focused elements
- ALL transitions: `transition: all 0.3s ease` minimum
- Border radius: `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 16px`, `--radius-xl: 24px`

### 2.2 Component Standards
- **UI Cards**: Hover effect (golden glow + subtle lift)
- **Tarot card elements**: Fixed aspect ratio **2:3** (standard tarot proportion)
- **Buttons**:
  - Primary: gold gradient background
  - Secondary: ghost/outline
  - Danger: red variant
  - ALL must have hover + active states with glow
- **Modals**: Center overlay, backdrop blur(8px), fade-in + scale, mystic border glow
- **Toasts**: Bottom-center (mobile), auto-dismiss 3s, info/success/warning/error
- **Forms**: Focus states with golden border glow
- **Empty states**: Symbolic icon + poetic description + CTA button
- **Loading**: Mystical spinner (rotating symbol or orbiting dots)
- **Bottom Navigation**: 4 tabs: 🃏 Decks | 🔮 Draw | 📐 Spreads | ⚙️ Settings
  - Thumb-friendly (minimum 48px touch targets)
  - Active tab: gold accent + subtle glow

### 2.3 Tarot Card Display Rules
- **Aspect ratio**: ALWAYS 2:3 (width:height)
- **Card back**: Deck's back image when face-down
- **Card front**: Card image + name overlay at bottom
- **Face-down state**: Default when dealt, subtle breathing animation
- **Flip animation**: 3D CSS rotateY — CONFIGURABLE on/off per Settings
  - ON: 0.6s `ease-in-out` rotateY(180deg), `backface-visibility: hidden`
  - OFF: instant swap
- **Reversed cards** (when enabled in Settings):
  - Rotate 180° (upside down), reversed badge indicator
  - Default: **OFF** — upright only
- **Selected/Active card**: Enhanced golden glow border

### 2.4 Animation Rules — CONFIGURABLE
- **Global animation toggle** in Settings
- **Card flip toggle** separately controlled
- Animations disabled →
  - Cards show face-up immediately
  - No dealing motion (appear in place)
  - No particles, UI transitions still allowed
- Animations enabled →
  - Dealing: cards fly from center to positions (staggered)
  - Flip: 3D rotate on tap
  - Shuffle: deck wobble before deal
  - Reveal All: sequential flip 0.15s stagger
  - Sparkle particles on flip
- ALWAYS respect `prefers-reduced-motion` media query

### 2.5 Responsiveness — Mobile-First
- **Primary**: 375px - 428px (phones)
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+ (bonus)
- Touch targets minimum **44px × 44px**
- Spread layout scales proportionally to viewport

### 2.6 Accessibility
- All interactive elements: `title` or `aria-label`
- All buttons/links: unique descriptive `id`
- Color contrast ≥ 4.5:1 body text, ≥ 3:1 large text
- Focus visible outlines

---

## 3. Module Rules

### 3.1 Deck Manager — STRICT

**Three deck categories** (phân vùng quản lý riêng):

| Category | Chuẩn | Cho phép thêm lá | Có Arcana/Suit |
|:---|:---:|:---:|:---:|
| 🃏 Tarot | 78 lá | ✅ Có (79-100+) | ✅ Major/Minor/Extra |
| 🔮 Oracle | Tùy ý | ✅ Hoàn toàn tự do | ❌ Không |
| 🌸 Lenormand | 36 lá | ✅ Có thể mở rộng | ❌ Không (chỉ số thứ tự) |

- When creating deck: AI gợi ý danh sách + user verify
- Each card MUST have: `name` (EN). Tất cả fields khác optional
- **Default deck**: Exactly ONE marked default at a time
- Card images: Blob in IndexedDB (offline), WebP on cloud (sync)
- **Back image**: ONE shared per deck, required for proper flip display
- **ALL properties manually editable** at any time — Add, Remove, Edit, Reorder

### 3.2 Card Scanner — STRICT
- Camera requires HTTPS — `serve.ps1` must provide HTTPS
- Prefer native `<input capture>` for highest quality
- Auto-crop pipeline: Cloudinary → fallback manual crop → user confirms
- Enhancement: Cloudinary enhance → before/after preview → user chooses
- Batch scan: Gemini identifies cards, preview + confirm before saving
- NEVER overwrite existing image without confirmation
- File upload: jpeg, png, webp. Max processed: 1200px longest edge

### 3.3 Companion Importer — STRICT
- **Three methods**: Camera OCR, Text paste, File upload (.txt/.pdf/.docx)
- Gemini parses → JSON per-card → fuzzy match to deck cards
- User previews + verifies + reassigns mismatches
- Original text preserved, Vietnamese translation by Gemini (tarot context)
- User can edit translations manually
- Incremental import: merge, confirm overwrites

### 3.4 Card Reader — STRICT
- **Fisher-Yates shuffle ONLY** — NEVER `Array.sort(() => Math.random())`
- **No duplicate draws** in one reading session
  - Clone deck → shuffle → pop from top
  - Cannot draw more than deck size
- Default draw: **3 cards** (configurable 1-10)
- **Reversed cards**: OFF by default, toggle in Settings
  - When on: 50% chance per card
  - Reversed display: rotated 180° + badge
- Initial state: ALL cards **face-down** (back image)
- Tap → flip (animation), tap flipped → detail popup
- "Reveal All" → sequential flip (stagger 0.15s)
- Detail popup ordered:
  1. Card image (zoomable)
  2. Name EN / VI
  3. Keywords EN / VI
  4. Details EN / VI
  5. Companion text EN / VI
  6. *(If reversed)*: reversed interpretation
  7. *(If spread mode)*: position label + position meaning

### 3.5 Spread Builder — STRICT
- Coordinate system: **percentage-based** (0-100%) for responsive scaling
- Touch-enabled drag & drop (`touch*` + `mouse*` events)
- **Snap alignment:**
  - Center lines (x=50%, y=50%)
  - Sibling alignment (within 5% threshold)
  - Equal spacing suggestions
  - Grid snap toggle (10% divisions)
- Preset spreads: immutable, but can duplicate & edit
- Import from image: Gemini analysis → user adjusts
- ALL properties editable always

### 3.6 AI Service — STRICT
- **Gemini FIRST** for all tasks (FREE tier). OpenAI as FALLBACK
- NEVER block UI on AI failure — always provide manual alternative
- All prompts stored as **named constants** (tunable)
- Rate limiting: track req/min, delay if near limit
- Every AI call: try-catch + user-friendly error
- **Cache** responses in IndexedDB (same input → no re-call)
- Translation: MUST include tarot/divination context in prompt

### 3.7 Cloud Sync — STRICT
- **Dropbox PRIMARY**, Google Drive FALLBACK
- **Offline-first**: FULL app functionality without internet
- Sync queue: every mutation logged with timestamp
- Bidirectional sync: local ↔ cloud
- Image upload: compress → WebP (1200px, q=0.85) → cloud
- Image download: cloud → IndexedDB Blob (offline access)
- **"Download All Images" button** for bulk offline caching
- Connection indicator ALWAYS visible
- Manual sync trigger available
- NEVER auto-delete cloud data without confirmation

---

## 4. Code Quality Rules

### 4.1 Naming Conventions
- **Variables/Functions**: camelCase (`selectedDeck`, `flipCard`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_DRAW_COUNT`, `FLIP_DURATION`)
- **CSS classes**: kebab-case (`tarot-card`, `deck-grid`)
- **IDs**: camelCase (`deckListView`, `cardDetailModal`)
- **i18n keys**: dot-notation (`deck.title`, `reader.flipAll`)
- **IndexedDB stores**: snake_case (`decks`, `cards`, `sync_queue`)

### 4.2 Code Organization
- File header block comment:
  ```js
  /* =============================================
     Module Name — Tarot PWA
     Brief description
     ============================================= */
  ```
- Section comments for grouping
- Max function length: ~50 lines
- NO inline styles in JS — use CSS classes
- NO `eval()`, `document.write()`, or `innerHTML` for user content
- Use `textContent` for user text, sanitize for HTML templates

### 4.3 Error Handling
- All API/file/camera calls: try-catch with user-facing messages
- AI failures: ALWAYS offer manual fallback
- Edge cases: 0 cards, empty deck, no API key → helpful guidance
- Network errors: graceful offline fallback

### 4.4 Documentation
- **CHECKPOINT.md**: update after every phase
- **RULES.md**: NEVER modify without USER approval
- Inline comments for non-obvious logic
- JSDoc for public module methods

---

## 5. Development Workflow Rules

### 5.1 Before Starting Any Task
1. Read RULES.md completely
2. Read CHECKPOINT.md for current state
3. Understand existing code before modifying
4. Plan changes before coding

### 5.2 During Development
- ONE phase at a time — test before next
- Always test on 375px mobile viewport
- Keep IndexedDB schema backward-compatible
- Never break existing features
- AI calls: handle loading + success + error states

### 5.3 After Completing a Phase
1. Test on mobile browser
2. Update CHECKPOINT.md
3. Zero console errors
4. All UI states correct (empty/loading/data/error)
5. Test offline behavior
6. Record browser demo for visual changes

---

## 6. Performance Rules
- Initial load: no heavy computation, lazy-load modules
- Animations: 60fps, use `transform` + `opacity` only
- Images: lazy load, progressive (thumb → full)
- IndexedDB: cache frequently accessed data in memory
- API calls: debounce and batch
- Image processing: progress indicator, never freeze UI
- Service Worker: cache static aggressively
- GSAP/CDN libs: load async, never block initial render

---

## 7. Tarot Domain Rules

### 7.1 Deck Structures

**Tarot** (default 78, extensible):
```
Major Arcana (22): #0 The Fool → #21 The World
Minor Arcana (56): 4 suits × 14 cards (Ace-10 + Page/Knight/Queen/King)
Extra cards (optional): Additional Major Arcana, variant cards, bonus cards
```

**Oracle** (no fixed structure):
```
Any number of cards (typically 30-60)
No suits, no arcana categories
Each card: unique name + meaning
```

**Lenormand** (36 cards):
```
#1 Rider → #36 Cross
No suits, pure numbered sequence with symbolic names
```

### 7.2 Shuffling & Drawing Rules
- Fisher-Yates shuffle before every reading
- Draw from top — NOT random pick from middle
- **No card can appear twice** in one reading
- Reversed: determined at draw time (if enabled), 50% probability
- Max drawable = deck size

### 7.3 Reversed Card Rules
- **Default: DISABLED** (upright only)
- Toggle in Settings: "Cho phép lá bài ngược"
- When enabled: each drawn card has independent 50% chance
- Reversed card = rotated 180° visually + uses reversed interpretation if available
- If no reversed interpretation stored: show upright interpretation + "reversed" badge

### 7.4 Spread Position Rules
- Each position has specific meaning context
- Card interpretation changes based on position
- Position order = drawing order
- Positions use percentage coordinates for responsive scaling

---

*Last updated: 2026-04-18*
*Approved by: USER*
