# Contributing to Cards

Thanks for wanting to help. Cards is a small, personal app with one big promise: **your cards never leave your phone.** So the bar is simple: keep it private, keep it offline, keep it simple, and keep the README true.

## Ways to help

- **Report a bug** with the [bug report form](https://github.com/warwickbuilds/cards/issues/new?template=bug_report.yml). Say which version (bottom of Settings), which phone and Android version, and the steps to make it happen.
- **Suggest an idea** with the [feature request form](https://github.com/warwickbuilds/cards/issues/new?template=feature_request.yml). Check [Future enhancements](README.md#future-enhancements) first; it may already be planned.
- **Send a pull request.** For anything bigger than a small fix, open an issue first so we can agree on the approach before you spend time on it.
- **Security problems** go through [SECURITY.md](SECURITY.md), never a public issue.

## Ground rules

These are the app's standing rules. A PR that breaks one will be asked to change.

1. **Local-first, zero data collection.** No analytics, no crash reporting, no cloud sync, no AI, no ads, no accounts, and no background network calls. The only permitted network call is the manual-only **Settings → Check for updates** request to GitHub Releases in `src/lib/updates.ts` (enforced by a static test).
2. **Never commit real card data.** No real card photos, card numbers, or anything derived from them, in code, tests, issues or screenshots. Tests use tiny fake JPEG bytes; screenshots use made-up cards.
3. **Card pictures live only in the encrypted database.** Don't write them to disk as files; delete any temporary file (camera, crop, resize) straight after use.
4. **One keyed connection.** Write to the database only through `inTransaction` / `exclusively` in `src/db/transaction.ts`. Never use `withExclusiveTransactionAsync` or `useNewConnection`: a second connection has no SQLCipher key.
5. **Everything is backed up.** New tables must be added to the backup (`src/db/repo.ts` export/import and `src/lib/backupData.ts`).
6. **Minimal permissions.** A new Android permission needs a very good reason and has to be listed in the README and [PRIVACY.md](PRIVACY.md).
7. **Every PR updates `README.md`** in the same PR: status, features, the changelog row, the version and dependency table if they change, architecture, security and privacy, maintenance steps and future enhancements. See [CLAUDE.md](CLAUDE.md).

## Setting up

You need Node 22, npm, and an Android 16+ phone or emulator (Pixel 10 and newer, `arm64-v8a`). The app runs in an Expo development build (not Expo Go) because it uses SQLCipher and other native modules.

```bash
git clone https://github.com/warwickbuilds/cards.git
cd cards
npm ci
npm run android   # builds and installs a development build
```

More detail is in the README under [Running it](README.md#running-it), and [AGENTS.md](AGENTS.md) has notes on how Expo works in this SDK. [docs/DESIGN.md](docs/DESIGN.md) explains the UX and security choices.

## Before you open a pull request

Run all checks. CI runs the same ones on every pull request.

```bash
npm test
npm run typecheck
npm run lint
npx expo-doctor
npx expo export -p android
```

- Put pure logic in `src/lib` with a test in `src/lib/__tests__`.
- Changing the database? Append a migration to `MIGRATIONS` in `src/db/schema.ts`. Never edit one that has shipped. Read the README's [Maintenance](README.md#maintenance) notes.
- Adding a package? Use `npx expo install <package>` so it matches the Expo SDK, and make sure it doesn't add network access, tracking or new permissions.
- Keep pull requests focused: one change per PR is easier to review and release.
- Fill in the pull request template, including screenshots (light and dark, with made-up cards) for anything visual.

## Releases

Only the maintainer makes releases. The version in `app.json` and `package.json` is bumped in a PR, and a tagged release builds the signed APKs with GitHub Actions. See [Releases](README.md#releases).

## Code of conduct

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
