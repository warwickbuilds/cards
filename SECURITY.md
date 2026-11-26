# Security policy

Cards stores photos of payment cards, IDs and loyalty cards, so security problems matter a lot to us. Thank you for helping keep it safe.

## Supported versions

Only the [latest release](https://github.com/warwickbuilds/cards/releases/latest) gets fixes. Cards has no internet access and can't tell you about updates, so please check you're on the latest version before reporting (**Settings**, version at the bottom).

| Version | Supported |
| --- | --- |
| Latest release | Yes |
| Anything older | No |

## Reporting a vulnerability

**Please don't open a public issue for a security problem.**

Use GitHub's private reporting instead: open the repo's [Security tab](https://github.com/warwickbuilds/cards/security) and choose **Report a vulnerability**. Only the maintainer can see it.

Please include:

- The app version, phone model and Android version
- What the problem is and what someone could do with it
- Steps to reproduce it, or a proof of concept

**Never attach photos of real cards, card numbers or a real backup file.** Use made-up cards.

You should hear back within a week. Once a fix is released, you'll be credited in the changelog if you'd like.

## What's in scope

Things we especially want to hear about:

- Any way the app can reach a network, or any build that ships with the `INTERNET` permission
- Card photos, notes or the database key ending up outside the encrypted database: loose files in cache or storage, logs, the clipboard, Android backups, thumbnails or the recent-apps screenshot
- Reading the database without the key, or getting the key out of the Android Keystore without the phone's unlock
- Getting past the app lock, or screenshots and screen recording working while `FLAG_SECURE` is on
- Weaknesses in the `.cardsbackup` format (PBKDF2-HMAC-SHA256 + AES-256-GCM): decrypting without the passphrase, tampering that isn't detected, or a crafted backup that corrupts data or crashes the app on restore
- Release APKs that aren't signed with the published certificate
- Anything in the GitHub Actions workflows that could expose the signing secrets

Out of scope: attacks that need a rooted or already compromised phone, or the phone's own screen-lock PIN (Android's biometric prompt always accepts it), and weak passphrases chosen by the user.

## How the project keeps secrets out of the repo

- **There are no app secrets.** Cards has no servers, API keys or accounts. The only key is the database key, which is generated on each phone and kept in its Android Keystore.
- **The release signing key is never committed.** `*.jks`, `*.p12`, `*.p8`, `*.key` and `*.pem` are in `.gitignore`. The keystore only lives in GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64` and friends) and in the maintainer's offline backups.
- **Release builds check their own signature.** When `ANDROID_CERT_SHA256` is set, the workflow refuses to publish an APK signed with any other key.
- Pull request builds from forks get no secrets and are signed with a throwaway debug key, so they can't be installed over a real release.
- **No real card data in the repo, ever.** Tests use tiny fake JPEG bytes.

## Checking a download

Every release is signed with the same key. Its certificate SHA-256 is:

```
5d88d9a692842701578e71c4456eaceaabe5a46639dad2f508359d122c0bad5e
```

Check an APK with `apksigner verify --print-certs cards-<version>-arm64.apk` (Android SDK build tools) and compare the `SHA-256 digest` line. Check that it can't use the network with `aapt2 dump permissions cards-<version>-arm64.apk`: `android.permission.INTERNET` must not be in the list.

The full security model is in the README under [Security and privacy](README.md#security-and-privacy). The privacy policy is [PRIVACY.md](PRIVACY.md).
