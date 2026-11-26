# Design notes

Why Cards looks and works the way it does.

## What the best wallet apps get right

Looked at: Google Wallet, Apple Wallet, Stocard (now Klarna), Catima (open source, offline) and Rick's previous web version (Axis).

| Pattern | Where it comes from | In Cards |
| --- | --- | --- |
| The card photo is the hero; the name is secondary | Google/Apple Wallet | Tiles are real card-shaped photos (ID-1 ratio 85.6 × 54 mm). The name sits **under** the card, never on top of the photo, so it's always readable (Axis overlaid white text on busy photos and truncated it). |
| One tap to show the card at the counter | Stocard, Catima | Tapping a tile opens it straight to a black, full-brightness, kept-awake view. No intermediate "details" dialog. |
| Most-used cards first | Stocard | Default order is "Most used first" (open count, then last opened). Pin anything to the very top. |
| Groups you can switch off | Catima groups | Categories have colours and an on/off switch. Switched-off categories disappear from home but search still finds their cards, and a footer says how many are hidden. |
| Quick filtering | Google Wallet, Catima | Search across names, notes and category, plus a row of category chips. |
| Front and back | Catima | Two photo slots; the viewer has a Front/Back switch. |
| Show the barcode big | Stocard, Catima | Pinch to zoom, double-tap to zoom, rotate a card sideways to fill the screen, and an immersive mode (tap the card) that hides everything else. |
| Lock and privacy | Banking apps | Biometric/PIN app lock, screenshots blocked, blank in recent apps. |

## What changed from Axis

- **Native Android app**, not a website, so it works with no signal, opens instantly, and can use the fingerprint sensor, brightness and camera properly.
- **Home** is a two-column grid of card photos, grouped by category with colour dots, with pinned cards first. No "Category: Bank" text headers, no hero paragraph, and the Add button is a floating button that is always in reach.
- **Viewing** a card is a dedicated dark screen at full brightness, instead of a white modal with small thumbnails.
- **Editing** is a full screen (photos first, then name, category chips, notes) instead of a modal with a dropdown. Leaving with unsaved changes asks first.
- **Status** moved from each card to categories, as asked. A card follows its category.

## Visual language

- Neutral greys with one accent colour (indigo) for actions, so the colourful card photos are what you notice.
- Category colours are a fixed palette of 11, stored by name, so a restored backup looks the same.
- Follows the phone's light or dark mode. The card viewer is always black (best contrast for scanners, and kind to OLED).
- System font (Roboto on Android), 16 pt body, 48 dp touch targets, text scales with the phone's font size up to 1.3×.
- Placeholder art (category colour + initials) when a card has no photo yet, so the grid never has holes.

## Security choices

See the README's **Security and privacy** section. In short: SQLCipher database with a hardware-backed key, photos inside the encrypted database, no INTERNET permission, no Android backup, app lock, FLAG_SECURE, encrypted backups with a passphrase.
