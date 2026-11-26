## What this changes

<!-- What does this PR do, and why? Link the issue if there is one (Fixes #123). -->

## Screenshots

<!-- For anything visual: before and after, light and dark. Never include real card photos. Delete this section if nothing on screen changes. -->

## Checklist

- [ ] `npm test`, `npm run typecheck`, `npm run lint` and `npx expo export -p android` pass
- [ ] `README.md` is updated: status, features, a changelog row, versions, architecture, services, maintenance and future enhancements, wherever this change touches them
- [ ] Version bumped in `app.json` and `package.json` if this is going into a release
- [ ] Database change? A new migration appended in `src/db/schema.ts` (no edits to shipped ones), and the backup format still covers every table
- [ ] Still offline: no new network calls, no INTERNET permission, no analytics
- [ ] No real card photos, card numbers, keys or keystores committed
