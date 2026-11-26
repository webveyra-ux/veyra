# VEYRA — Beauty, Styling & Creative Services Marketplace

**Tagline:** *Discover. Connect. Create.*  
**Core Proposition:** *One request. Multiple professionals. Better choices.*  
**Brand Attribution:** A product of **Damayanti Network** (division of Damayanti Crest).

---

## 1. Platform Overview

VEYRA is a full-stack Next.js (App Router) + TypeScript + Tailwind CSS + Firebase marketplace platform connecting customers with independent beauty, styling, and creative professionals across 10 dynamic categories:

- Makeup, Hair, Mehendi, Nails, Skincare and Beauty
- Styling, Fashion Design, Interior Design, Graphic Design, Photography

### Key Capabilities Implemented
- **Customer Portal (`/customer/*`)**: 10-step Post a Requirement wizard (with draft saving, reference image compression & Storage upload, privacy-protected venue details), Request management tabs, Side-by-side Proposal comparison, Shortlisting, Atomic proposal-to-booking acceptance, Real-time Messaging, Booking lifecycle management, Completed-booking Verified Reviews, Favourites, Saved Addresses, and Self-service Account Deletion.
- **Professional Studio (`/professional/*`)**: 12-step resumable Onboarding wizard, Profile & cover editing, Portfolio manager (images/videos, category tagging, cover selection, ordering), Service & pricing catalogue, Availability schedule (weekly hours, days off, temporary unavailable, flexible requests), Verification submission (restricted private documents), Matched Request Feed with rule-based match scores & explanations, Proposal Builder (inclusions/exclusions/terms), Real-time Messaging, Booking transitions, and Real-data Analytics.
- **Admin Portal (`/admin/*`)**: Strictly enforced via Firebase Auth Custom Claims (`admin: true` + `adminLevel` role matrix: `super_admin`, `operations_admin`, `verification_admin`, `support_admin`, `content_admin`) and `adminRoles`. Includes Verification queue with short-lived signed URLs for private documents, User & Professional suspension/featuring, Dynamic Category/Subcategory manager, Request & Booking oversight, Review moderation, Report management, CMS Content & Promotions editor, Real-data Analytics, Role assignment, and Audit Trail.
- **Security & Privacy**: Restrictive `firestore.rules` & `storage.rules`, server-side transactions via Next.js API Route Handlers (`/api/*`) + optional Firebase Cloud Functions (`functions/`), private subcollection `requests/{id}/privateDetails/contact` for venue addresses, and complete anonymisation/deletion workflow.

---

## 2. Explicit Scope & Integration Disclosures

- **Payments**: Online payment gateway, wallet, and escrow are intentionally **not** enabled in this launch release. Bookings record agreed prices (`paymentStatus: 'offline_agreed'`) for direct offline settlement.
- **AI Features**: No AI matching or generated summaries are simulated. Matching uses transparent rule-based filters and weighted scoring computed strictly from real profile data.
- **Search**: Powered by indexed Firestore queries with cursor pagination and normalized search tokens (`SEARCH_CAPABILITIES`). External full-text search (Algolia/Typesense) can be plugged into `src/lib/search/provider.ts`.
- **Maps**: Map mode stays explicitly disabled until `NEXT_PUBLIC_MAPS_PROVIDER=google` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` are configured (`src/lib/maps/provider.ts`).
- **Phone OTP & Web Push**: Phone OTP (`NEXT_PUBLIC_ENABLE_PHONE_AUTH=true`) and Web Push (`NEXT_PUBLIC_FIREBASE_VAPID_KEY`) are gated behind valid Firebase Console configuration so disabled features are never misrepresented as active.

---

## 3. Prerequisites & Installation

- **Node.js** `20.9+` (tested on `v24.21.0`)
- **npm** `10+`
- **Java 21+** (required only if running local Firebase Emulator Suite for development / rules testing)

```bash
git clone <your-github-repo-url>
cd veyra
npm install
```

Create your local environment file from the safe template:

```bash
cp .env.example .env.local
```

---

## 4. Firebase Configuration Setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** -> **Email/Password** (and optionally **Phone** if your project billing & authorized domains are configured).
3. Enable **Cloud Firestore** and **Firebase Storage**.
4. Register a **Web App** in Project Settings and copy the `NEXT_PUBLIC_FIREBASE_*` values into `.env.local`.
5. For server-side trusted routes (`/api/proposals/accept`, `/api/bookings/[id]/transition`, `/api/reviews`, `/api/requests/distribute`, `/api/account/delete`, `/api/admin/*`) and CLI scripts:
   - Generate a Service Account key in Firebase Project Settings -> Service accounts (keep it outside Git!) and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `.env.local`.
6. Deploy Firestore rules, indexes, and Storage rules:

```bash
npx firebase login
npx firebase use <your-project-id>
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

### Optional Cloud Functions (Firebase Blaze Plan)
```bash
cd functions
npm install
npm run build
cd ..
npx firebase deploy --only functions
```
*(Note: All critical transactional flows also run via authenticated Next.js API Route Handlers on Vercel without requiring Blaze Cloud Functions.)*

### Optional Web Push (FCM) & App Check
- **FCM**: Generate a Web Push certificate key pair in Firebase Project Settings -> Cloud Messaging and set `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
- **App Check**: Register reCAPTCHA v3 in Firebase App Check and set `NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY`.

---

## 5. Secure Admin Initialization & Category Seeding

VEYRA does **not** include a public admin signup page and does **not** hardcode admin credentials.

1. First register a regular account via `/auth/register` (or create the user in Firebase Console -> Authentication).
2. Grant `super_admin` Custom Claims and create the `adminRoles` document using the trusted server script:

```bash
npm run init:admin -- --email admin@yourdomain.com --level super_admin
```

3. Seed the initial 10 categories, subcategories, and default platform settings into Firestore:

```bash
npm run seed:categories
```

4. Sign out and sign back in on the web app so the user's Firebase ID token refreshes with the new `admin: true` custom claim, then open `/admin`.

---

## 6. Local Development & Testing

### Start Development Server
```bash
npm run dev
```

### Run Typecheck, Lint & Production Build
```bash
npm run typecheck
npm run lint
npm run build
```

### Run Unit Tests
```bash
npm test
```

### Run Firebase Emulator Suite & Security Rules Tests
Ensure Java 21+ is on your `PATH`, then run:
```bash
npm run test:rules
```
To run the full app locally against Firebase Emulators:
1. Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local`.
2. Start emulators: `npm run emulators`
3. Start Next.js: `npm run dev`

---

## 7. Deployment (Vercel + GitHub)

1. Push your repository to GitHub (verify `.env.local` and service-account JSONs are excluded by `.gitignore`).
2. Import the repository into **Vercel**.
3. Configure all environment variables from `.env.example` in Vercel Project Settings (keep `FIREBASE_PRIVATE_KEY` without `NEXT_PUBLIC_` prefix).
4. Add your Vercel production domain to **Firebase Console -> Authentication -> Settings -> Authorized domains**.
5. Deploy!

---

## 8. Future Android App (Capacitor)

VEYRA is structured with mobile-first views, safe-area inset CSS, custom modals (no `window.alert`/`confirm`), and a `capacitor.config.ts` template (`com.damayantinetwork.veyra`).

To wrap the deployed production platform into an Android shell later:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```
Update `capacitor.config.ts` `server.url` to your production HTTPS domain (or set `CAPACITOR_BUILD=true` for static asset bundling if exporting static routes).
