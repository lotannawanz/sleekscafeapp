# Sleek's Cafe Command Center

Point of Sale (POS) and operational management command center for **Sleek's Cafe**, built with React, Firebase (Auth, Firestore, Hosting), Tailwind CSS, and Webpack.

---

## ☕ Features

- **Point of Sale (POS) & Real-Time Sales Tracking**:
  - Quick-select menu items across Matcha, Refreshers, Coffee, SleeksLates, Merch/Goods, and Food.
  - Multi-item order calculation with real-time tax/total summaries.
  - Live order logging synced directly with Cloud Firestore.
- **Role-Based Access Control (RBAC)**:
  - **Staff Mode**: Fast order entry, order history, and daily summary.
  - **Admin Mode**: Full financial oversight, expense tracking, daily reconciliation, and margin analysis.
- **Expense & Margin Tracking**:
  - Log operating expenditures by category (Ingredients, Packaging, Logistics, Utilities, Staff).
  - Compare gross revenue against overhead in real time.
- **Firebase Backend Integration**:
  - **Firebase Authentication**: Email/password authentication with admin access verification.
  - **Cloud Firestore**: Real-time listeners (`onSnapshot`) for instant cross-device state synchronization.
  - **Firebase Hosting**: Production-ready static hosting configuration.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Lucide React (Icons)
- **Styling**: Tailwind CSS, Inter font
- **Backend / Database**: Google Firebase (Firestore, Auth, Hosting)
- **Build Tooling**: Webpack 5, Babel

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- Firebase project credentials (configured in `src/firebase-config.js` or via environment variables)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lotannawanz/sleekscafeapp.git
   cd sleekscafeapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the bundle**:
   ```bash
   # Development build with source maps
   npm run build

   # Or watch for changes
   npm run watch
   ```

4. **Serve locally or deploy to Firebase**:
   ```bash
   # Test locally using any static server or Firebase emulators
   npx serve public

   # Deploy to Firebase Hosting
   firebase deploy --only hosting
   ```

---

## 📁 Project Structure

```
SleeksCafeApp/
├── public/                 # Static assets & bundled output
│   ├── index.html          # HTML entry point with Tailwind CDN
│   ├── logo.jpg            # Brand logo
│   └── bundle.js           # Compiled Webpack bundle (generated on build)
├── src/                    # Source code
│   ├── SleeksCafeCommandCenter.jsx  # Main application logic & UI
│   ├── firebase-config.js  # Firebase configuration template
│   └── index.jsx           # React root mounting
├── .firebaserc             # Firebase project configuration
├── firebase.json           # Firebase Hosting & Firestore rules
├── firestore.indexes.json  # Database composite indexes
├── firestore.rules         # Security rules for Firestore
├── package.json            # Project dependencies and build scripts
└── webpack.config.js       # Webpack bundle configuration
```

---

## 🔒 Security & Rules

Firestore security rules enforce read/write validation on both the `sales` and `expenses` collections. Ensure you deploy `firestore.rules` alongside your hosting assets:

```bash
firebase deploy --only firestore:rules
```

---

## 📄 License

Proprietary. All rights reserved.
