# Horse Auction

A real-time horse auction platform with interactive 3D horse models, anonymous bidding, and 24-hour countdown timers. Built with Expo (React Native Web) and Node.js/Express.

## Features

- **Interactive 3D Horse Models** — procedural Three.js horses that reflect each horse's coat color (Bay, Grey, Black, Palomino, Chestnut, Buckskin, etc.) with drag-to-rotate controls
- **Anonymous Bidding** — quick-bid buttons (+$100 / +$500 / +$1K / +$5K) and custom bid input
- **24-Hour Auctions** — live HH:MM:SS countdown timers on every card
- **Start Auction** — create new auctions with horse details and starting price
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

- **Frontend**: Expo SDK 52, React Native Web, TypeScript, Three.js
- **Backend**: Node.js, Express, CORS, in-memory data store
- **3D**: Three.js with MeshPhysicalMaterial, studio lighting, shadow mapping