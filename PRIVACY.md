# Privacy policy

_Last updated: 26 November 2026. Applies to the Cards Android app, version 0.1.0 and later._

**The short version: Cards collects nothing. Your cards never leave your phone.**

## What we collect

Nothing. Cards has no servers, no accounts, no analytics, no telemetry, no crash reporting, no advertising and no third-party SDKs that send data. The developer never receives, sees or stores any of your information, so there is nothing to sell, share, hand over or lose in a breach.

The release app doesn't have Android's `INTERNET` permission, so it is technically unable to send or receive anything over Wi-Fi or mobile data. Anyone can [check this](README.md#check-it-yourself).

## What stays on your phone

Everything you put into Cards stays on your device:

- Card photos (front and back), names, notes and categories
- Settings, and how often you open each card (for "Most used first")

All of it is stored in an encrypted database (SQLCipher, AES-256). The encryption key is random, created on your phone, and protected by the Android Keystore. Card photos are kept inside the encrypted database, not as image files in your gallery or storage.

Android's automatic cloud backup is switched off for Cards, so none of this is copied to Google Drive or any other cloud.

## Permissions

| Permission | Why | When |
| --- | --- | --- |
| Camera | To photograph a card | Asked the first time you take a photo. You can pick from the gallery instead. |
| Biometric | For the app lock (fingerprint, face or screen lock) | Used when the app opens or re-locks |

Internet, storage, media, microphone and other permissions are explicitly blocked. Choosing a photo from the gallery uses Android's own photo picker, which only gives Cards the one photo you pick.

## Backups

A backup is created only when you ask for it, and saved only where you choose (a folder on the phone, a USB drive, or anywhere the Android file picker can reach). It is encrypted with a passphrase you choose (PBKDF2 + AES-256-GCM). The passphrase isn't stored anywhere, and without it nobody can open the file, including you and including us.

If you put a backup file in a cloud folder yourself, that service's own privacy policy applies to the (still encrypted) file.

## Deleting your data

- **Delete everything** in Settings wipes every card, photo and custom setting, and resets categories back to the defaults.
- Uninstalling the app, or clearing its storage in Android settings, deletes everything too.
- Backup files you made are yours; delete them like any other file.

Because nothing is held anywhere else, there is nothing more for us to delete.

## Children

Cards collects no data from anyone, including children.

## Changes

If this policy ever changes, the new version will be in this file, with the change listed in the README changelog. Any change that let data leave the phone would be a fundamental change to what Cards is, and would be stated clearly in the release notes.

## Contact

Questions about privacy: open an issue on [GitHub](https://github.com/warwickbuilds/cards/issues). Security problems: please use [private reporting](SECURITY.md).
