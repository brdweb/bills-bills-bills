# BillManager Mobile App

React Native app built with Expo for Android/iOS.

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app (for physical device) OR Android Studio (for emulator)

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm start
```

## Testing Options

### Option 1: Physical Device (Recommended for quick testing)
1. Install "Expo Go" from Play Store (Android) or App Store (iOS)
2. Ensure your phone and computer are on the same WiFi network
3. Run `npm start` and scan the QR code with Expo Go

### Option 2: Android Emulator
1. Install Android Studio from https://developer.android.com/studio
2. Open Android Studio → More Actions → Virtual Device Manager
3. Create a virtual device (Pixel 6 or similar recommended)
4. Start the emulator
5. Run `npm run android`

### Option 3: Web (Limited functionality)
```bash
npm run web
```
Note: Some features like SecureStore won't work on web.

## API Configuration

The app connects to different backends based on environment:

| Environment | API URL |
|-------------|---------|
| Development (emulator) | `http://10.0.2.2:5001/api/v2` |
| Development (physical) | Update IP in `src/api/client.ts` |
| Production | `https://app.billmanager.app/api/v2` |

### Testing with Physical Device
If using a physical device, update `src/api/client.ts`:
```typescript
const API_BASE_URL = __DEV__
  ? 'http://YOUR_COMPUTER_IP:5001/api/v2'  // Replace with your IP
  : 'https://app.billmanager.app/api/v2';
```

Find your IP: `ip addr | grep "inet 192"`

## Project Structure
```
src/
├── api/
│   └── client.ts       # API client with auth handling
├── context/
│   └── AuthContext.tsx # Authentication state management
├── navigation/
│   └── AppNavigator.tsx # Navigation configuration
├── screens/
│   ├── LoginScreen.tsx
│   ├── BillsScreen.tsx
│   └── SettingsScreen.tsx
└── types/
    └── index.ts        # TypeScript type definitions
```

## Backend Requirements
Run the Flask backend locally:
```bash
cd ../billmanager/server
DATABASE_URL=postgresql://billsuser:billspass@192.168.40.240:5432/bills_test FLASK_RUN_PORT=5001 python app.py
```
