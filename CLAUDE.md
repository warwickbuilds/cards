# Working on this repo

Read `AGENTS.md` for Expo rules and `README.md` for how the app is built. `docs/DESIGN.md` explains the UX and security choices.

## Keep the README current (standing rule from Rick)

Every pull request updates `README.md` in the same PR. Before opening or updating a PR, check and edit each section the change touches:

- **Status** and **Features**: what works now.
- **Versions and changelog**: add a row for the PR. Update the app version and the dependency table when they change.
- **Architecture**: new screens, tables, migrations, folders or patterns.
- **Security and privacy**: anything that changes what is stored, how it is protected, or what leaves the phone.
- **Maintenance**: new steps for building, upgrading, migrating or releasing.
- **Future enhancements**: add every idea for later that comes up in discussion, and remove items once they ship.

## Hard rules

- The app is fully offline. Never add network access, analytics, crash reporting, cloud sync or AI. The release build has no INTERNET permission (`app.config.js`); keep it that way.
- Never commit real card photos, card numbers or anything derived from them (tests use tiny fake JPEG bytes).
- Card pictures live only inside the encrypted database. Don't write them to disk as files; delete any temporary file straight after use.
- Write to the database only through `inTransaction` / `exclusively` in `src/db/transaction.ts`. Never use `withExclusiveTransactionAsync` or `useNewConnection`: a second connection has no SQLCipher key.
- New tables must be added to the backup (`src/db/repo.ts` export/import and `src/lib/backupData.ts`).
- Run `npm test`, `npm run typecheck`, `npm run lint` and `npx expo export -p android` before a PR.
