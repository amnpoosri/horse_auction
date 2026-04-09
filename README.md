# Horse Auction

A horse auction platform built with Expo (React Native) for cross-platform support (Android, iOS, Windows) and Node.js/Express for the backend API.

## Project Structure

```
horse_auction/
├── frontend/          # Expo React Native app (Android, iOS, Windows)
└── backend/           # Node.js/Express API server
```

## Frontend

Built with [Expo](https://expo.dev/) using React Native with TypeScript. Supports:
- 📱 Android
- 🍎 iOS
- 🪟 Windows (via react-native-windows)
- 🌐 Web

### Setup & Run

```bash
cd frontend
npm install
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run windows    # Run on Windows
npm run web        # Run on Web
```

## Backend

Built with [Node.js](https://nodejs.org/) and [Express](https://expressjs.com/), with MongoDB via Mongoose.

### Setup & Run

```bash
cd backend
npm install
cp .env.example .env   # Configure your environment variables
npm run dev            # Development with nodemon
npm start              # Production
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/horses` | List all horses |
| POST | `/api/horses` | Create a horse |
| GET | `/api/horses/:id` | Get a horse |
| PUT | `/api/horses/:id` | Update a horse |
| DELETE | `/api/horses/:id` | Delete a horse |
| GET | `/api/auctions` | List all auctions |
| POST | `/api/auctions` | Create an auction |
| GET | `/api/auctions/:id` | Get an auction |
| PUT | `/api/auctions/:id` | Update an auction |
| DELETE | `/api/auctions/:id` | Delete an auction |
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create a user |
| GET | `/api/users/:id` | Get a user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |

## Tech Stack

- **Frontend**: Expo, React Native, TypeScript, react-native-windows
- **Backend**: Node.js, Express, MongoDB, Mongoose