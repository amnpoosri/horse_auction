# Horse Auction — Project Plan

> Living document for iterating on the Horse Auction platform.
> Last updated: April 9, 2026

---

## Architecture Overview

```
horse_auction/
├── backend/          Express.js API (port 3000)
│   └── src/
│       ├── index.js              Middleware, route mounting
│       └── routes/
│           ├── auctions.js       CRUD + bidding, 12 seed auctions
│           ├── horses.js         Stub — not yet implemented
│           └── users.js          Stub — not yet implemented
└── frontend/         Expo SDK 52 + React Native Web
    └── App.tsx       Single-file app (~1400 lines)
```

**Data store:** In-memory (no database yet). Mongoose is installed but unused.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Expo (React Native Web) | SDK 52 |
| UI runtime | React Native + react-native-web | 0.76.5 / 0.19.13 |
| 3D rendering | Three.js (MeshPhysicalMaterial) | 0.183.2 |
| Language | TypeScript (strict mode) | 5.3.3 |
| Backend framework | Express.js | 4.21.2 |
| Environment | GitHub Codespaces (Ubuntu 24.04) | — |

---

## What's Been Built

### Backend API

| Method | Endpoint | Status |
|--------|----------|--------|
| `GET` | `/api/auctions` | ✅ Returns all auctions |
| `GET` | `/api/auctions/:id` | ✅ Single auction |
| `POST` | `/api/auctions` | ✅ Create auction (requires horseName, startingPrice) |
| `POST` | `/api/auctions/:id/bids` | ✅ Anonymous bid (must exceed currentBid, auction not ended) |
| `PUT` | `/api/auctions/:id` | ✅ Update auction |
| `DELETE` | `/api/auctions/:id` | ✅ Delete auction |
| `*` | `/api/horses/*` | ⬜ Stub routes |
| `*` | `/api/users/*` | ⬜ Stub routes |

**Seed data:** 6 active auctions (24h timer) + 6 sold auctions (past dates with bid histories).

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `App` | Root — state management, 5s auto-refresh, responsive grid |
| `AuctionCard` | Active auction card with countdown, price, bid count |
| `SoldAuctionCard` | Sold card with SOLD ribbon, gold price, uptick %, days ago |
| `AuctionDetailModal` | Full detail view — image, tags, timer/sold date, quick bids, custom bid, bid history |
| `StartAuctionModal` | Create auction form |
| `HorseImage` | Renders URL image or falls back to 3D placeholder |
| `Horse3DPlaceholder` | Three.js procedural horse with drag-to-rotate |
| `CountdownDisplay` | HH:MM:SS timer blocks |
| `Overlay` | Web-compatible modal backdrop (replaces RN Modal) |

**Custom hooks:** `useResponsive()` (breakpoints + column count), `useCountdown()` (timer logic).

### 3D Horse System

- Procedural geometry: overlapping spheres (neck), cylinders (legs), lathe curves, Catmull-Rom splines (mane/tail)
- MeshPhysicalMaterial with clearcoat sheen
- Studio 4-point lighting + shadow mapping (PCFSoft, 1024²)
- 10 horse color palettes mapped to material properties
- Drag-to-rotate interaction, auto-rotation, breathing animation
- Emoji fallback on non-web platforms

---

## Design System

### Color Palette (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| bg-page | `#0f172a` | Page background |
| bg-card | `#1e293b` | Card surfaces |
| bg-header | `#1e1b4b` | Header, modal accents |
| brand | `#7c3aed` | Primary buttons, accents |
| text-primary | `#f1f5f9` | Headings |
| text-secondary | `#94a3b8` | Body text, subtitles |
| text-muted | `#8b9ab5` | Labels, meta (WCAG AA: 5.15:1) |
| accent-green | `#34d399` | Active bid price |
| accent-gold | `#fbbf24` | Sold/final price |
| accent-red | `#dc2626` | SOLD badge, ended state |
| border | `#334155` | Dividers, borders |

### Responsive Breakpoints

| Width | Columns | Flag |
|-------|---------|------|
| < 700px | 1 | mobile |
| 700–1199px | 2 | `isWide` |
| ≥ 1200px | 3 | `isDesktop` (≥1000) |

### Price Color by Auction State

| State | Color | Label |
|-------|-------|-------|
| Active | `#34d399` (green) | "Current Bid" |
| Ended | `#94a3b8` (gray) | "Final Price" |
| Sold | `#fbbf24` (gold) | "Final Price" |

---

## Auction Data Model

```typescript
type Bid = { amount: number; bidder: string; timestamp: string };

type Auction = {
  id: string;
  horseName: string;
  breed: string;
  age: number;
  color: string;        // Maps to 3D horse palette
  description: string;
  image: string;         // URL or '' (triggers 3D fallback)
  startingPrice: number;
  currentBid: number;
  bids: Bid[];
  endsAt: string;        // ISO date
  status: string;        // 'active' | 'sold'
  soldDate?: string;     // ISO date (sold auctions only)
};
```

### Horse Colors → 3D Palettes

Bay, Grey, Black, Gold/Palomino, Chestnut/Sorrel, Buckskin, White, Roan, Pinto/Paint, Dun — each mapped to `{ body, dark, accent, hoof }` hex values for MeshPhysicalMaterial.

---

## Accessibility

- All text meets **WCAG AA** contrast (≥4.5:1 on `#1e293b` background)
- `accessibilityRole="button"` on interactive cards
- `accessibilityLabel` with full context (name, breed, status, price)
- `resizeMode="contain"` for images (no content clipping)
- Large touch targets for bid buttons

---

## Known Issues & Tech Debt

1. **No persistent storage** — all data resets on server restart (Mongoose installed but unused)
2. **Single-file frontend** — App.tsx is ~1400 lines, should be split into components
3. **Stub routes** — horses.js, users.js are empty placeholders
4. **No authentication** — all bids are anonymous, no user accounts
5. **No image upload** — image field is a URL string (empty triggers 3D fallback)
6. **Timer-only auction end** — no server-side cron to finalize auctions
7. **No tests** — no unit or integration tests exist
8. **Codespaces-specific URL detection** — API URL logic is tailored to GitHub Codespaces

---

## Future Iteration Ideas

### Near-term
- [ ] **Persist to MongoDB** — connect Mongoose, migrate in-memory store to collections
- [ ] **Split App.tsx** — extract components into `frontend/src/components/`, hooks into `frontend/src/hooks/`
- [ ] **Image upload** — allow users to upload horse photos (S3/Cloudinary)
- [ ] **Server-side auction finalization** — cron job or scheduled task to mark auctions as sold when timer expires
- [ ] **Search & filter** — filter by breed, color, price range, status
- [ ] **Sort options** — ending soon, price low/high, most bids

### Medium-term
- [ ] **User authentication** — JWT-based auth, user profiles
- [ ] **Real-time updates** — WebSocket or SSE instead of 5s polling
- [ ] **Bid history per user** — track which auctions a user has bid on
- [ ] **Watchlist** — save auctions to watch
- [ ] **Notifications** — outbid alerts, auction ending soon
- [ ] **Pagination** — paginate auction list for large datasets

### Long-term
- [ ] **Native mobile** — build iOS/Android via Expo EAS
- [ ] **Payment integration** — Stripe for auction settlements
- [ ] **Admin dashboard** — manage auctions, users, disputes
- [ ] **Analytics** — bid patterns, popular breeds, price trends
- [ ] **3D model improvements** — GLTF horse models, animation sequences

---

## Development Commands

```bash
# Backend
cd backend && npm install
node src/index.js                    # Starts on port 3000

# Frontend
cd frontend && npm install
npx expo start --web --port 8081     # Starts Metro + web

# Type check
cd frontend && npx tsc --noEmit

# Codespaces: set port 3000 to public visibility for API access
```

---

## Commit History Highlights

| Commit | Description |
|--------|-------------|
| Initial | Skeleton project with stub routes + Expo welcome screen |
| Core | Auction CRUD API, bidding logic, seed data |
| UI | Dark theme cards, countdown timers, responsive grid |
| 3D | Procedural Three.js horse with color mapping, studio lighting |
| Sold | 6 sold auctions, SoldAuctionCard, Recently Sold section |
| Polish | SOLD badge in detail modal, sold date display, WCAG AA contrast fixes |
