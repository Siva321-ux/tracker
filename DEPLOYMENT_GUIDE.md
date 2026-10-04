# 🚀 Production Deployment Guide for LoRa Field Tracker

This document provides a step-by-step production deployment guide for the **LoRa Field Tracker** application stack.

---

## 🏗 System Architecture Overview

```
                        ┌──────────────────────────────────────────┐
                        │       LoRa Mesh & Gateway Layer          │
                        │   (ESP32 / Heltec Wireless Tracker)      │
                        └────────────────────┬─────────────────────┘
                                             │  Bluetooth SPP / Serial
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                Mobile Application                                       │
│                       (React Native / Expo Router Cross-Platform)                       │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │ Local SQLite DB &    │  │ Offline Map Cache    │  │ Sync Manager                 │   │
│  │ DB Queue             │  │ Tile Cache Manager   │  │ Batch Sync Engine            │   │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘   │
└────────────────────────────────────────────┬───────────────────────────────────────────┘
                                             │ REST API (JWT) & Socket.IO
                                             ▼
                        ┌──────────────────────────────────────────┐
                        │          Production Backend              │
                        │      (Node.js / Express / Socket.IO)     │
                        └────────────────────┬─────────────────────┘
                                             │ MySQL Connection Pool
                                             ▼
                        ┌──────────────────────────────────────────┐
                        │          MySQL Database Server           │
                        └──────────────────────────────────────────┘
```

---

## 1. 🗄 Backend Server & MySQL Database Deployment

### Prerequisites
- Node.js `v18.x` or higher
- MySQL `8.0` or MariaDB `10.5`
- PM2 (Process Manager) or Docker

### Step 1.1: Database Setup
1. Log in to your MySQL server:
   ```bash
   mysql -u root -p
   ```
2. Create the production database and user:
   ```sql
   CREATE DATABASE lora_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'lora_user'@'%' IDENTIFIED BY 'YourStrongPassword123!';
   GRANT ALL PRIVILEGES ON lora_tracker.* TO 'lora_user'@'%';
   FLUSH PRIVILEGES;
   ```
3. Import `schema.sql`:
   ```bash
   mysql -u lora_user -p lora_tracker < c:/comm/backend/schema.sql
   ```

### Step 1.2: Environment Configuration
Create `.env` file in `c:/comm/backend/.env`:
```ini
PORT=5000
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=lora_user
DB_PASSWORD=YourStrongPassword123!
DB_NAME=lora_tracker
JWT_SECRET=super_secret_production_key_987654321
```

### Step 1.3: Build & Start Node.js Backend
```bash
cd c:/comm/backend
npm install --production
npm run build
```

Run using **PM2** for process management:
```bash
npm install -g pm2
pm2 start dist/index.js --name "lora-backend"
pm2 save
pm2 startup
```

---

## 2. 📱 Mobile Application Build & Release (Expo)

### Step 2.1: Pre-Build Configuration
Ensure `c:/comm/mobile/app.json` has production package parameters configured:
```json
{
  "expo": {
    "name": "LoRa Field Tracker",
    "slug": "lora-field-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.fieldops.loratracker",
      "adaptiveIcon": {
        "backgroundColor": "#18181B"
      }
    },
    "ios": {
      "bundleIdentifier": "com.fieldops.loratracker"
    }
  }
}
```

### Step 2.2: Export Standalone Web App
To host the mobile web version on Nginx, Apache, Vercel, or Netlify:
```bash
cd c:/comm/mobile
npx expo export --platform web
```
The production web bundle is created in `c:/comm/mobile/dist/`.

### Step 2.3: Build Standalone Android APK / Bundle (EAS)
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure EAS:
   ```bash
   eas build:configure
   ```
3. Run Android build:
   ```bash
   # Build standalone APK for direct installation
   eas build --platform android --profile preview

   # Build Google Play AAB bundle
   eas build --platform android --profile production
   ```

---

## 3. 📡 LoRa Gateway & ESP32 Hardware Integration

### Supported Hardware
- Heltec Wireless Tracker (ESP32-S3 + SX1262 LoRa + GNSS)
- TTGO T-Beam (ESP32 + SX1276 + Neo-6M GPS)

### Packet Protocol Format
The ESP32 gateway formats incoming LoRa RF packets and sends them over Bluetooth Serial (SPP) using ascii strings:

1. **Telemetry Position Packet**:
   ```
   LOC,<deviceId>,<latitude>,<longitude>,<hh:mm:ss>,<battery%>
   Example: LOC,dev1,11.0168,76.9558,12:02:00,88
   ```

2. **Private Message Packet**:
   ```
   CHAT,<senderName>,<targetDeviceId>,<messageBody>
   Example: CHAT,Arun,dev2,Checkpoint 2 reached
   ```

---

## 4. 🗺 Offline Map Tile Preloading

1. Open **Offline Maps Directory** in the app.
2. Select any India Micro-Region (e.g., *Coimbatore Urban*, *Chennai Port*, *Bengaluru Whitefield*, *Mumbai South Coast*, *Delhi Connaught Place*).
3. Tap **📥 Download**. The bounding box tiles zoom levels 10..14 (~7–12 MB) are stored directly inside local SQLite database `offline_regions`.
4. Disconnect Internet. Map tile rendering continues automatically from cached vector/raster tiles in local storage!

---

## ⚡ Production Health Verification Commands

- Backend Healthcheck Endpoint: `GET http://your-domain.com:5000/api/health`
- Database Table Count Verification: `SELECT count(*) FROM users;`
- Socket.IO Realtime Telemetry: Listening on port `5000` with namespace `/`
