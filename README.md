# LoRa-Based Offline Team Mapping, Tracking & Communication System

Production-ready, responsive full-stack field operations application built with **React Native Expo** (TypeScript, Expo Router) on mobile and **Node.js Express** (MySQL, REST, Socket.IO, JWT) on backend.

---

## 🌟 Core Features

1. **Offline-First Map Architecture**:
   - Genuinely offline-capable vector/raster map tile engine.
   - Allows downloading bounding-box geographical map regions (e.g., Sathy Region) while connected to Internet.
   - Complete offline functionality with downloaded map tile layers when Internet is disconnected.

2. **LoRa Location & Telemetry Processing**:
   - Parses telemetry packets: `LOC,dev1,28.6050,77.3700,12:02:00,88`.
   - Validates coordinates (latitude: -90..90, longitude: -180..180), device IDs, and generic telemetry value.
   - Built-in `LoraSimulator` for testing 5 devices (`dev1`..`dev5`) live movement without physical hardware.

3. **5-Device Live Map Tracking**:
   - Normalized marker state updates (`dev1`, `dev2`, `dev3`, `dev4`, `dev5`).
   - Marker details bottom sheet displaying Device Name, Teammate Name, Latitude, Longitude, Last Updated, Battery/Telemetry %, and quick chat triggers.

4. **Team & Offline Messaging**:
   - Public Team Chat & Private 1-to-1 Messaging.
   - Automatic local queueing when offline ("Waiting for connection...").
   - Auto-sync with Node.js Express server when Internet returns.

5. **Multi-Language Support (i18n)**:
   - Complete **English** and **Tamil** (தமிழ்) localization with runtime language switcher.

6. **Bluetooth Gateway Abstraction**:
   - Isolated `BluetoothService` class managing gateway scanning, connection, reconnection, and packet forwarding.

---

## 📁 Repository Structure

```
c:/comm/
├── backend/                  # Node.js Express API & Database Backend
│   ├── schema.sql            # MySQL Relational Schema (users, teams, devices, locations, etc.)
│   ├── src/
│   │   ├── config/           # DB connection pool (MySQL + SQLite dev fallback)
│   │   ├── controllers/      # Auth, Teams, Devices, Locations, Messages, Sync
│   │   ├── routes/           # REST API routes
│   │   ├── middleware/       # JWT auth & centralized error handler
│   │   └── websocket/        # Socket.IO handlers
│   └── tests/                # Module 1 Backend & DB tests
├── mobile/                   # React Native Expo App (TypeScript)
│   ├── app/                  # Expo Router navigation screens
│   │   ├── (auth)/           # Login & Register
│   │   └── (main)/           # Map, Team, Chat, Offline Maps, Notifications, Settings
│   ├── src/
│   │   ├── components/       # Field Map, Device BottomSheet, Status Badges, Chat Bubbles
│   │   ├── database/         # SQLite local storage & query layer
│   │   ├── services/         # BluetoothService, LoraPacketParser, LoraSimulator, TileCacheManager, SyncManager
│   │   ├── store/            # Zustand state stores (deviceStore, networkStore, etc.)
│   │   ├── i18n/             # Tamil & English localization dictionaries
│   │    me utils/            # Responsive flexbox spacing & typography
│   └── tests/                # Module 2, 3 & End-to-End MVP test runners
```

---

## 🛠️ Quick Start & Execution

### 1. Run Backend Server
```bash
cd backend
npm install
npm run dev
```

### 2. Run Mobile Application
```bash
cd mobile
npm install
npx expo start
```

### 3. Run Automated Module & E2E Tests
- **Backend & DB Tests**:
  ```bash
  cd backend
  npm test
  ```
- **LoRa Packet Parser Tests**:
  ```bash
  npx --prefix mobile ts-node mobile/tests/test-lora-parser.ts
  ```
- **Mobile SQLite Local Database Tests**:
  ```bash
  npx --prefix mobile ts-node mobile/tests/test-mobile-sqlite.ts
  ```
- **Complete End-to-End MVP Integration Test**:
  ```bash
  npx --prefix mobile ts-node mobile/tests/test-end-to-end-mvp.ts
  ```

---

## 🗄️ MySQL Database Setup Instructions

To connect to a live MySQL instance, update `backend/.env`:
```env
PORT=5000
JWT_SECRET=your_secure_jwt_secret
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lora_tracker
```
Import `backend/schema.sql`:
```bash
mysql -u root -p < backend/schema.sql
```
