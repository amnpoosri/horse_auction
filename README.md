# 🐴 Horse Auction

A real-time horse auction platform where buyers can browse, bid, and win horses through timed auctions — featuring interactive 3D horse models rendered in the browser with Three.js.

Built as a full-stack web application with an Expo (React Native Web) frontend and a Node.js/Express backend. Every horse is rendered as a procedural 3D model that reflects its actual coat color, complete with drag-to-rotate controls, studio lighting, and shadow mapping. Auctions run on 24-hour countdown timers with anonymous bidding, and the UI adapts seamlessly from mobile to desktop.

## Demo

<!-- Replace the placeholder below with your actual recording -->
<!-- Option 1: Upload a .gif or .mp4 to the repo and reference it -->
<!-- Option 2: Record with a tool like LICEcap, Kap, or OBS and add to assets/ -->

https://github.com/user-attachments/assets/REPLACE_WITH_VIDEO_ID

> **To record a preview:**
> 1. Open the running app in your browser (Codespaces forwarded port 8081)
> 2. Use a screen recorder ([Kap](https://getkap.co/) on macOS, [LICEcap](https://www.cockos.com/licecap/) for GIF, or OBS)
> 3. Capture the auction grid, 3D horse rotation, and bidding flow
> 4. Drag the video file into a GitHub issue/PR comment to upload it — GitHub generates an `assets/` URL
> 5. Replace the placeholder URL above with the generated link

## What It Does

**For Buyers:**
- Browse active auctions with live countdown timers (HH:MM:SS)
- View each horse as an interactive 3D model — drag to rotate, auto-rotates when idle
- Place anonymous bids with quick-bid buttons (+$100 / +$500 / +$1K / +$5K) or custom amounts
- See real-time bid history and price movement on each auction
- Browse recently sold horses with final sale prices and percentage gains

**For Sellers:**
- Create new auctions with horse details (name, breed, age, color, description, starting price)
- Auctions automatically run for 24 hours with live timers
- Track bids as they come in (5-second auto-refresh)

**Technical Highlights:**
- 🎨 **10 horse coat colors** procedurally mapped to 3D materials (Bay, Grey, Black, Palomino, Chestnut, Buckskin, White, Roan, Pinto, Dun)
- 🖥️ **Responsive grid** — 1 column on mobile, 2 on tablet, 3 on desktop
- ♿ **WCAG AA accessible** — all text meets 4.5:1 contrast ratio, semantic labels on all interactive elements
- 🏆 **Recently Sold section** — sold auctions with SOLD ribbon, gold pricing, price uptick badges, and time-ago labels
- 🌐 **Codespaces-ready** — auto-detects forwarded port URLs, works out of the box

## Features

- **Interactive 3D Horse Models** — procedural Three.js horses that reflect each horse's coat color (Bay, Grey, Black, Palomino, Chestnut, Buckskin, etc.) with drag-to-rotate controls
- **Anonymous Bidding** — quick-bid buttons (+$100 / +$500 / +$1K / +$5K) and custom bid input
- **24-Hour Auctions** — live HH:MM:SS countdown timers on every card
- **Start Auction** — create new auctions with horse details and starting price
- **Recently Sold** — completed auctions displayed with final prices, bid counts, and sale dates
- **Responsive UI** — 1-column on mobile, 2 on tablet, 3 on desktop
- **Auto-Refresh** — auction data updates every 5 seconds

## Project Structure

```
horse_auction/
├── frontend/          # Expo React Native app (Web)
│   ├── App.tsx        # Full auction UI + 3D horse renderer
│   └── package.json
└── backend/           # Node.js/Express API server
    └── src/
        ├── index.js   # Express server entry point
        └── routes/
            ├── auctions.js  # Auction CRUD + bidding (in-memory store)
            ├── horses.js
            └── users.js
```

## Quick Start

### Backend

```bash
cd backend
npm install
node src/index.js      # Starts on port 3000
```

### Frontend

```bash
cd frontend
npm install
npx expo start --web   # Starts on port 8081
```

> **Codespaces**: Ports are auto-detected. Set port 3000 to public:
> ```bash
> gh codespace ports visibility 3000:public -c "$CODESPACE_NAME"
> ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/auctions` | List all auctions |
| GET | `/api/auctions/:id` | Get auction details |
| POST | `/api/auctions` | Create a new auction |
| POST | `/api/auctions/:id/bids` | Place an anonymous bid |
| PUT | `/api/auctions/:id` | Update an auction |
| DELETE | `/api/auctions/:id` | Delete an auction |

### Create Auction

```json
POST /api/auctions
{
  "horseName": "Thunder Bolt",
  "breed": "Thoroughbred",
  "age": 5,
  "color": "Bay",
  "description": "A powerful racehorse",
  "startingPrice": 15000
}
```

### Place Bid

```json
POST /api/auctions/:id/bids
{
  "amount": 16000
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Expo SDK 52, React Native Web, TypeScript |
| **3D Rendering** | Three.js — MeshPhysicalMaterial, studio 4-point lighting, PCFSoft shadow mapping, ACESFilmic tone mapping |
| **Backend** | Node.js, Express, CORS |
| **Data Store** | In-memory (ready for MongoDB via Mongoose) |
| **Environment** | GitHub Codespaces with auto-detected port forwarding |

## Seed Data

The app ships with 12 pre-loaded auctions for testing:

| Horse | Breed | Color | Status | Price |
|-------|-------|-------|--------|-------|
| Thunder Bolt | Thoroughbred | Bay | Active | $15,000 |
| Silver Star | Arabian | Grey | Active | $24,500 |
| Midnight Runner | Friesian | Black | Active | $35,000 |
| Golden Spirit | Palomino QH | Gold | Active | $13,200 |
| Celtic Dream | Irish Sport Horse | Chestnut | Active | $28,000 |
| Desert Wind | Akhal-Teke | Buckskin | Active | $48,000 |
| Royal Majesty | Hanoverian | Bay | Sold | $82,000 |
| Snowflake | Lipizzaner | White | Sold | $56,500 |
| Iron Will | Clydesdale | Bay | Sold | $24,000 |
| Phantom | Andalusian | Grey | Sold | $71,000 |
| Copper Ridge | Quarter Horse | Chestnut | Sold | $14,500 |
| Stardust | Gypsy Vanner | Pinto | Sold | $43,000 |