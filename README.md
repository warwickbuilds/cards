# Cards

Your physical cards on your Android phone: bank cards, loyalty cards, memberships and IDs, photographed front and back, shown full screen at full brightness when you need them. **Fully offline, no account, encrypted.**

- Add a card in seconds: snap the front and back, give it a name, pick a category.
- Tap it at the counter: black screen, brightness up, screen stays on, pinch to zoom, rotate to fill the screen.
- Categories with colours that you can switch on and off.
- Search, pins, and "most used first" so the card you need is at the top.
- App lock with fingerprint, face or screen lock; screenshots blocked.
- Encrypted backup and restore to a file you choose.

## Contents

- [Install](#install)
- [Your data and privacy](#your-data-and-privacy)
- [Status](#status)
- [Features](#features)
- [Versions and changelog](#versions-and-changelog)
- [Architecture](#architecture)
- [Security and privacy](#security-and-privacy)
- [Services](#services)
- [Running it](#running-it)
- [Releases](#releases)
- [Maintenance](#maintenance)
- [Future enhancements](#future-enhancements)

## Install

1. Until the first release is published, download the APK from the **cards-<version>-apks** artifact on the latest successful **Android release** run in the Actions tab (it's a zip; unzip it on the phone and open `cards-<version>-arm64.apk`). After a release, take it from [Releases](https://github.com/warwickbuilds/cards/releases/latest) instead.
2. Android asks whether your browser or Files app may install unknown apps: tap **Settings**, turn on **Allow from this source**, go back and tap **Install**.
3. If Play Protect says the app is unrecognised, tap **More details → Install anyway**.

Builds from pull requests are signed with a debug key. A later signed release can't install over them, so uninstall first (after making a backup).

## Your data and privacy

- Everything stays on your phone. Cards has **no internet permission at all**, so it can't send anything anywhere, even by mistake. No account, no ads, no analytics, no AI.
- Your cards, photos and notes are stored in an **encrypted database**. The key is kept in Android's hardware-backed keystore.
- **Uninstalling the app, or clearing its storage, deletes your cards.** Android's own cloud backup is switched off for this app on purpose (so your card photos never end up in a Google backup). Make a backup in **Settings → Back up** and keep the file somewhere safe.
- Backups are encrypted with a passphrase you choose. Without the passphrase nobody (including you) can open one, so don't forget it.

## Status

Version **0.1.1**: fixes 0.1.0 not opening on a phone.

| Area | State |
| --- | --- |
| Cards: add, edit, delete, front and back photos, notes, pin | Done |
| Categories: add, rename, colour, reorder, switch on/off, delete | Done |
| Home: grouped by category, pinned first, search, category chips, sort | Done |
| Full-screen viewer: full brightness, keep awake, zoom, rotate, immersive | Done |
| Security: encrypted database, app lock, screenshot blocking, no network | Done |
| Encrypted backup and restore (merge or replace) | Done |
| Tested on a real phone | 0.1.0 failed on first launch (fixed in 0.1.1); 0.1.1 not yet confirmed on a phone |

## Features

### Home

- Cards are shown as card-shaped photos in two columns, with the name underneath (never written over the photo).
- **Pinned** cards come first, then one section per category (in your order, with its colour), then cards with no category.
- **Search** matches names, notes and category names, ignoring case and accents. It also finds cards in switched-off categories.
- **Category chips** filter to one category.
- **Order**: most used first (default), A to Z, or newest first. Settings → Order.
- **Long-press** a card for Edit, Pin and Delete.
- Switched-off categories are hidden; a note at the bottom says how many cards are hidden, with a **Show** button.

### Showing a card

- Opens on a black screen at **full brightness** (toggle with the sun button; default in Settings) and keeps the screen on.
- **Front/Back** switch, **pinch or double-tap to zoom**, drag when zoomed.
- **Rotate** turns the card sideways to fill the screen, handy for barcodes.
- **Tap the card** for an immersive view with nothing else on screen.
- Name, category and notes underneath (notes can be selected and copied).
- Every opening is counted for "Most used first".

### Adding and editing

- Two card-shaped photo slots. Tap one to **take a photo**, **choose from the gallery**, **rotate** or **remove**.
- Photos are cropped to the shape of a bank card by default (Android's crop screen). Turn off **Crop photos to card shape** in Settings for odd-shaped cards.
- Name, category (chips, plus **New…** to make one on the spot), notes and **Pin to top**.
- Leaving with unsaved changes asks first. After adding a card it opens straight away.

### Categories

- Starts with Bank, Loyalty, ID and Membership. Rename, recolour (11 colours), reorder with the arrows, add or delete.
- The **switch** turns a category on or off. Off categories and their cards are hidden from home.
- Deleting a category keeps its cards (they move to "No category").

### Settings

- **App lock** (fingerprint, face or screen lock) and **Lock again** after immediately, 30 seconds, 1, 5 or 15 minutes in the background. Default on, after 1 minute. Needs a screen lock on the phone.
- **Block screenshots** (default on): also blanks the app in the recent-apps view.
- **Full brightness**, **Order**, **Show switched-off categories**, **Crop photos to card shape**.
- **Back up**, **Restore**, **Delete everything** (asks for your fingerprint/PIN first).

### Backup and restore

- **Back up**: choose a passphrase (with a strength meter), choose a folder (for example Downloads or a USB drive), and Cards writes `cards-YYYY-MM-DD.cardsbackup`.
- **Restore**: pick the file, enter the passphrase, see what's inside, then **Add to my cards** (keeps what's on the phone; cards in both are updated) or **Replace all my cards**. A restore either fully succeeds or changes nothing.

## Versions and changelog

| Version | Date | PR | Changes |
| --- | --- | --- | --- |
| 0.1.1 | 2026-11-26 | #2 | Fix: 0.1.0 stopped on launch with "file is not a database". Writes ran on a second database connection that never got the encryption key. All writes now run, one at a time, on the one encrypted connection (`src/db/transaction.ts`). An install of 0.1.0 opens fine after updating, no reinstall needed. |
| 0.1.0 | 2026-11-26 | #1 | First version: cards with front/back photos and notes, categories with on/off, home grouped by category with search, full-brightness viewer with zoom and rotate, app lock, encrypted database, encrypted backup and restore, no internet permission. |

### Main dependency versions

| Package | Version |
| --- | --- |
| Expo SDK | 58.0.26 |
| React Native | 0.88.1 |
| React | 19.3.0 |
| expo-router | 58.0.32 |
| expo-sqlite (with SQLCipher) | 58.0.18 |
| expo-secure-store | 58.0.3 |
| expo-crypto (AES-GCM) | 58.0.8 |
| expo-local-authentication | 58.0.3 |
| expo-screen-capture | 58.0.6 |
| expo-brightness | 58.0.3 |
| expo-image / image-picker / image-manipulator | 58.0.18 / 58.0.10 / 58.0.16 |
| react-native-gesture-handler | 3.3.0 |
| react-native-reanimated | 4.7.1 |
| @noble/hashes (PBKDF2) | 2.4.0 |
| lucide-react-native | 1.80.0 |
| TypeScript | 6.0.3 |

Android 8.0 (API 26) and newer.

## Architecture

```
Screens (src/app, Expo Router stack)
   │  read through live hooks (src/db/DataProvider.tsx: useWallet, useCard, useSettings…)
   │  write through small functions (src/db/repo.ts), which bump a change counter (src/db/store.ts)
   │  every write is queued and wrapped in a transaction on the one keyed connection (src/db/transaction.ts)
   ▼
SQLite + SQLCipher on the phone (src/db/database.ts, schema and migrations in src/db/schema.ts)
   key: 256-bit random, in expo-secure-store (Android Keystore)
   photos: JPEG base64 inside the database (card_image table), never loose files

Pure logic (src/lib: wallet grouping and sorting, search, backup format and checks,
lock timing, passphrase strength) has no native imports and is unit tested.
```

Why this shape (and not the calories-and-steps one): that app uses Drizzle and stores photos as files. Cards keeps photos **inside the encrypted database** so they share its encryption, a card is always saved whole in one transaction, and there are no image files to leak or clean up. With only three tables, plain SQL with numbered migrations (`PRAGMA user_version`) is simpler than an ORM and has fewer dependencies.

### Screens

| Route | File | What |
| --- | --- | --- |
| `/` | `src/app/index.tsx` | Home grid, search, chips, long-press menu, Add button |
| `/card/[id]` | `src/app/card/[id].tsx` | Full-screen viewer |
| `/edit` | `src/app/edit.tsx` | Add (no `id`) or edit (`?id=`) a card |
| `/categories` | `src/app/categories.tsx` | Manage categories |
| `/settings` | `src/app/settings.tsx` | Settings |
| `/backup` | `src/app/backup.tsx` | `?mode=export` or `?mode=import` |

### Tables

| Table | Holds |
| --- | --- |
| `category` | id, name, colour key, active, sort order |
| `card` | id, category (nullable, set to null if the category is deleted), title, notes, pinned, use count, last used, timestamps |
| `card_image` | card id + side (front/back), full JPEG and thumbnail (base64), size. Deleted with the card. |
| `setting` | key/value JSON for the settings |

Migrations: append to `MIGRATIONS` in `src/db/schema.ts`; never edit a shipped one.

### Folder layout

```
src/app/         screens (Expo Router)
src/components/  UI pieces: CardTile, CardArt, ZoomableImage, PhotoSlot, CategorySheet, LockScreen, ui.tsx
src/db/          database, schema, repo (reads/writes), DataProvider hooks, change store
src/lib/         pure logic + photo, backup IO and AES helpers
src/security/    app lock and screenshot blocking
src/theme/       colours, tokens, light/dark
plugins/         config plugins: release signing, ABI splits, version code
docs/DESIGN.md   UX research and design decisions
```

## Security and privacy

| Threat | Protection |
| --- | --- |
| Data leaving the phone | No `INTERNET` permission in release builds (removed in `app.config.js`), so the OS blocks all network access. No analytics or crash reporting libraries. |
| Someone with the unlocked phone | App lock with Android's biometric prompt or screen lock (`expo-local-authentication`), on launch and after the chosen time in the background. |
| Shoulder-surfing / screenshots / recent apps | `FLAG_SECURE` (`expo-screen-capture`) blocks screenshots and screen recording and blanks the app in the app switcher. |
| Phone storage read off the device | Database encrypted with SQLCipher (AES-256). Key is 32 random bytes in `expo-secure-store`, encrypted by the hardware-backed Android Keystore. `secure_delete` overwrites deleted rows. |
| Leftover photo files | Camera, crop and resize outputs are deleted immediately after reading; the cache folders are swept on launch. `expo-image` is told not to cache card photos on disk. |
| Cloud/adb backups | `allowBackup: false`, so Android never copies the database (or its key) into Google backups. |
| Backup files | `.cardsbackup`: PBKDF2-HMAC-SHA256 (150,000 iterations, random salt) → AES-256-GCM with the header as authenticated data. Wrong passphrase or any tampering fails cleanly. Restored data is validated (ids, sizes, JPEG signatures, references) before anything is changed, and applied in one transaction. |
| Over-broad permissions | Only camera and biometric permissions. Microphone, storage, media, overlay, settings and network-state permissions are explicitly blocked. The gallery uses Android's photo picker (no storage permission). |

Limits worth knowing: anyone who knows your phone's screen-lock PIN can open the app (that's how Android biometrics work); a rooted or compromised phone can read app memory while it's unlocked; and a backup is only as strong as its passphrase.

## Services

None. Cards talks to no outside service, needs no keys and has no accounts. Android permissions used: **Camera** (taking photos, asked the first time), **Biometric** (app lock).

## Running it

```bash
npm install
npm test            # unit tests (jest)
npm run typecheck   # TypeScript
npm run lint        # ESLint (Expo + React Compiler rules)
npx expo export -p android   # bundle check
npm run android     # development build on a connected phone/emulator (sets CARDS_DEV=1)
```

`CARDS_DEV=1` keeps the INTERNET permission so a development build can reach Metro. Without it (every release and CI build) the permission is removed. Expo Go can't run this app (SQLCipher and other native modules); use a development build.

## Releases

APKs are built and signed by GitHub Actions (`.github/workflows/android-release.yml`) with `expo prebuild` + Gradle, the same way as calories-and-steps: an `arm64` APK and a `universal` APK per release.

### One-time setup: the release key

Android only installs an update signed with the same key as the installed app, so make one key and keep it safe (password manager plus an offline copy). Use a **new key for Cards** (alias `cards`), not the calories-and-steps one.

1. Make the key (Windows PowerShell, one line):

   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore cards-release.jks -alias cards -keyalg RSA -keysize 4096 -validity 36500 -dname "CN=Cards"
   ```

   macOS/Linux: the same `keytool -genkeypair …` command without the path.
2. Encode it: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("cards-release.jks")) | Set-Content keystore.txt` (or `base64 -i cards-release.jks | tr -d '\n' > keystore.txt`).
3. Get the fingerprint: `keytool -list -v -keystore cards-release.jks -alias cards`, copy the `SHA256:` line.
4. In **Settings → Secrets and variables → Actions**, add `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`cards`), `ANDROID_KEY_PASSWORD` and optionally `ANDROID_CERT_SHA256`.
5. Delete `keystore.txt`.

### Making a release

1. In a PR, bump `version` in `app.json` and `package.json` and add a changelog row.
2. After it merges, on GitHub open **Releases → Draft a new release**, create tag `v<version>` on `main` and publish. The workflow builds, signs and attaches both APKs (about 15 to 25 minutes).

Pull requests that touch the build set-up also build both APKs (debug-signed if no key is set up) and keep them as an artifact for 7 days.

## Maintenance

- **Upgrading Expo**: follow `AGENTS.md` (read the versioned docs, use `npx expo install --fix`). Check the SQLCipher flag still lands in `android/gradle.properties` (`expo.sqlite.useSQLCipher=true`) and that `INTERNET` is still removed from the merged manifest after `npx expo prebuild -p android`.
- **Transactions**: use `inTransaction` from `src/db/transaction.ts`. Never use expo-sqlite's `withExclusiveTransactionAsync` or `useNewConnection`: they open a second connection without the SQLCipher key and every write fails with "file is not a database". A test fails if either appears in `src`.
- **Database changes**: append a migration; add any new table to `exportAll`/`importAll` in `src/db/repo.ts` and to `parsePayload` in `src/lib/backupData.ts`; bump `DATA_FORMAT` if old apps can't read the new backups.
- **Backup file format** changes: bump `FILE_VERSION` in `src/lib/backupCrypto.ts` and keep reading the old one.
- **Never** commit real card photos or numbers. Tests use tiny fake JPEG bytes.

## Future enhancements

- **NFC**: read a contactless card's public details (card type, last four digits, expiry) to fill in the title and notes automatically. Android's NFC reader mode can do this offline with `react-native-nfc-manager`. Note: phones can't *emulate* bank cards (that needs a bank's tokenised Google Wallet integration), but they can store and replay simple loyalty/access card IDs on some readers via Host Card Emulation, which is worth a look for gym or building tags.
- **NFC tags**: tap a sticker (for example on your keyring) to jump straight to a card.
- **Barcode and QR scanning**: scan a loyalty card's barcode once (on-device, `expo-camera`) and redraw it crisp and full width, which scans more reliably at checkouts than a photo. Uses no AI and stays offline.
- **Automatic card edge detection and perspective correction** when taking a photo (on-device document scanner, for example ML Kit's offline scanner), instead of manual cropping.
- **Home-screen widget** or app shortcut for one-tap access to a pinned card (would bypass the app lock, so opt-in only).
- **Expiry reminders**: an expiry date field with a local notification a month before.
- **Drag to reorder** cards and categories instead of arrows.
- **Swipe between cards** in the full-screen viewer.
- **Wear OS** tile showing a pinned card's barcode.
- **Duplicate detection** when adding a card with the same name.
- **Scheduled reminder to back up**, since uninstalling deletes everything.
- **Hardware-bound key with biometrics** (`requireAuthentication` on the database key) for even stronger at-rest protection, at the cost of losing data if fingerprints are re-enrolled.
- **Optional decoy/stealth mode**: hide sensitive categories behind a second unlock.
