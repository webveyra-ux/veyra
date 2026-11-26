<div align="center">
  <img src="./public/logo/veyra-mark.svg" alt="VEYRA Logo" width="72" height="72" />
  <h1>VEYRA</h1>
  <p><strong>Discover. Connect. Create.</strong> &mdash; <em>One request. Multiple professionals. Better choices.</em></p>
  <p>A full-stack beauty, styling, and creative services marketplace &bull; A product of <strong>Damayanti Network</strong> (division of Damayanti Crest)</p>
</div>

---

## Live Architecture & Hosting Notice

- **Full-Stack Web Platform (Netlify / Vercel):** VEYRA is built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Firebase** (Auth, Firestore, Storage, Cloud Functions, optional FCM/App Check). Critical operations—matching distribution, atomic proposal-to-booking acceptance, booking state transitions, review eligibility, account deletion, and custom-claim admin actions—execute via authenticated server Route Handlers (`/api/*`) using `firebase-admin`.
- **GitHub Pages Showcase (`webveyra-ux.github.io/veyra/`):** Because GitHub Pages serves static files only and cannot execute Next.js server routes or hold `FIREBASE_PRIVATE_KEY` secrets, GitHub Actions deploys [docs-site/index.html](./docs-site/index.html) as the clean static brand showcase at `https://webveyra-ux.github.io/veyra/`. Deploy the full interactive application to **Netlify** (configured via [netlify.toml](./netlify.toml)) or **Vercel**.

---

## Implemented Platform Modules

| Portal / Layer | Key Features |
| :--- | :--- |
| **Public Marketplace** | Editorial homepage, 10 dynamic categories & subcategories, paginated directory search + filters, honest Map-unconfigured handling, public professional profiles, About/Contact/Legal drafts, SEO sitemap & `robots.ts` |
| **Customer Workspace (`/customer/*`)** | 10-step Post a Requirement wizard (drafts, compressed Storage images, protected private venue addresses), Request tabs, Side-by-side proposal comparison, Atomic booking creation, Real-time chat, Favourites, Saved addresses, Reauthenticated account deletion |
| **Professional Studio (`/professional/*`)** | 12-step resumable onboarding, Profile & cover editing, Image/video portfolio manager, Service catalogue, Weekly & date-off availability, Restricted verification document submission, Rule-based matched request feed, Proposal builder, Real-data analytics |
| **Admin Portal (`/admin/*`)** | Strictly enforced via Firebase Custom Claims (`super_admin`, `operations_admin`, `verification_admin`, `support_admin`, `content_admin`), Private verification review via signed URLs, User/Pro moderation, Dynamic category CRUD, Review & report moderation, CMS & promotions, Audit logs |
| **Firebase Backend** | Restrictive [firestore.rules](./firestore.rules), [storage.rules](./storage.rules), [firestore.indexes.json](./firestore.indexes.json), optional [functions/src/index.ts](./functions/src/index.ts) Cloud Functions, and Emulator security test suite |

---

## Explicit Scope & Integration Disclosures

- **Payments:** Online payment gateways, wallets, and escrow are intentionally disabled in this launch release; bookings record agreed values (`paymentStatus: 'offline_agreed'`) for direct settlement.
- **AI Features:** No AI matching or generated summaries are simulated; candidate matching uses transparent rule-based filters and weighted scoring (`src/features/matching/engine.ts`).
- **Search:** Indexed Firestore queries with cursor pagination and normalized tokens (`src/lib/search/provider.ts`).
- **Maps, Phone OTP & Push:** Gated explicitly behind valid provider configuration (`NEXT_PUBLIC_MAPS_PROVIDER`, `NEXT_PUBLIC_ENABLE_PHONE_AUTH`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`).

---

## Local Setup & Firebase Configuration

### 1. Install Dependencies
```bash
git clone https://github.com/webveyra-ux/veyra.git
cd veyra
npm install
cp .env.example .env.local
```

### 2. Configure Firebase
1. In [Firebase Console](https://console.firebase.google.com), enable **Authentication** (Email/Password; optionally Phone), **Cloud Firestore**, and **Firebase Storage**.
2. Add your Web App keys (`NEXT_PUBLIC_FIREBASE_*`) and Service Account credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) to `.env.local` (or Netlify/Vercel environment variables).
3. Deploy rules and indexes:
   ```bash
   npx firebase login
   npx firebase use <your-project-id>
   npx firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

### 3. Bootstrap Admin & Seed Categories
Register your admin account via `/auth/register`, then run:
```bash
npm run init:admin -- --email admin@yourdomain.com --level super_admin
npm run seed:categories
```
Sign out and back in to refresh your Firebase ID token custom claims before opening `/admin`.

---

## Verification & Testing Commands

```bash
npm run typecheck      # next typegen && tsc --noEmit
npm run lint           # ESLint
npm test               # Vitest unit tests (matching engine & Zod schemas)
npm run test:rules     # Firebase Auth/Firestore/Storage Emulator rules & transaction tests (Java 21+)
npm run build          # Production Next.js build
```

---

## Deployment

### Netlify (Included `netlify.toml`)
1. Connect `https://github.com/webveyra-ux/veyra` in **Netlify → Add new site → Import an existing project**.
2. Netlify reads [netlify.toml](./netlify.toml) (`command = "npm run build"`, `publish = ".next"`, `NODE_VERSION = "24"`).
3. Add all variables from [.env.example](./.env.example) under **Site configuration → Environment variables**.
4. Add your Netlify domain under **Firebase Console → Authentication → Settings → Authorized domains**.

### Vercel
1. Import `https://github.com/webveyra-ux/veyra` on Vercel, configure the same [.env.example](./.env.example) environment variables, and authorize the domain in Firebase Authentication.

---

## Future Android App (Capacitor)

VEYRA includes mobile-first layouts, PWA manifest ([public/manifest.json](./public/manifest.json)), safe-area CSS, and [capacitor.config.ts](./capacitor.config.ts) (`com.damayantinetwork.veyra`):
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android && npx cap sync android && npx cap open android
```
