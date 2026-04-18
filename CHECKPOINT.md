# Tarot PWA — Architecture Checkpoint

## Current State: Phase 11 Complete ✓

### Overview
Tarot PWA is a Progressive Web App for managing Tarot, Oracle & Lenormand card decks, performing card readings with 3D flip animations, and integrating AI for content import/translation.

### Architecture
- **Tech Stack**: Vanilla JS (ES6+), HTML5, CSS3 — no frameworks
- **Data Storage**: IndexedDB (`tarot_app_db`) — offline-first
- **Cloud Sync**: Dropbox API (primary), Google Drive (fallback)  
- **AI Services**: Gemini (primary/free), OpenAI (fallback/paid), Cloudinary (images)
- **Platform**: PWA with Service Worker

### Files Created
```
Tarot/
├── index.html          ✓ HTML shell, bottom nav, modal/toast/loading
├── app.js              ✓ Store (IndexedDB), App controller, i18n, Toast, Modal
├── style.css           ✓ Full mystic design system (900+ lines)
├── manifest.json       ✓ PWA manifest
├── serve.ps1           ✓ Dev server
├── RULES.md            ✓ Strict development rules
├── CHECKPOINT.md       ✓ This file
├── icons/
│   ├── icon-192.png    ✓
│   └── icon-512.png    ✓
└── modules/
    ├── settings.js           ✓ Phase 3: Settings & API Management
    ├── ai-service.js         ✓ Phase 4+5+6: Gemini AI & Cloudinary integration
    ├── deck-manager.js       ✓ Phase 4: Deck CRUD & Card Editor
    ├── card-scanner.js       ✓ Phase 5: Camera capture & AI Cropping
    ├── companion-importer.js ✓ Phase 6: Bulk AI text ingestion
    ├── card-reader.js        ✓ Phase 7+8: RNG Draw Engine, 3D UI, Spread support
    ├── spread-builder.js     ✓ Phase 8: Custom Spread Manager
    ├── reading-history.js    ✓ Phase 9: Journal & Readings History
    └── cloud-sync.js         ✓ Phase 11: Dropbox OAuth & JSON Backup Sync
```

### IndexedDB Schema (v1)
| Store | Key | Indexes |
|:---|:---|:---|
| decks | id | category, isDefault |
| cards | id | deckId, arcana, suit |
| spreads | id | category, isPreset |
| readings | id | deckId, spreadId, createdAt |
| companions | id | deckId |
| settings | key | — |
| sync_queue | auto | synced, timestamp |

### Design System
- **Theme**: Dark mystic (#0a0a1a → #1a0a2e)
- **Primary**: Mystic Gold (#d4a574)
- **Fonts**: Cinzel Decorative / Cormorant Garamond / Inter
- **Effects**: Glassmorphism, golden glow, starfield, card shimmer

### Modules Status
| Module | File | Status |
|:---|:---|:---|
| AI Service | ai-service.js | ✅ Complete |
| Settings | settings.js | ✅ Complete |
| Deck Manager | deck-manager.js | ✅ Complete |
| Card Scanner | card-scanner.js | ✅ Complete |
| Companion Importer | companion-importer.js | ✅ Complete |
| Card Reader | card-reader.js | ✅ Complete |
| Spread Builder | spread-builder.js | ✅ Complete |
| Reading History| reading-history.js| ✅ Complete |
| Cloud Sync | cloud-sync.js | ✅ Complete |

---
*Last updated: 2026-04-18 — Phase 11 Complete*
