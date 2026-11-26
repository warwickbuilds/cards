// Adds values derived from app.json. Edit app.json for everything else.
// - android.versionCode comes from the version, so every release goes up.
// - Release APKs are signed with the key from GitHub secrets (plugins/withReleaseSigning.js).
// - The INTERNET permission is removed so the installed app cannot reach any
//   network at all. Development builds need it to talk to Metro, so it is only
//   kept when CARDS_DEV=1 (set by `npm run android` and the EAS development profile).
const { androidVersionCode } = require('./plugins/versionCode');

module.exports = ({ config }) => {
  const dev = process.env.CARDS_DEV === '1';
  const blocked = [...(config.android?.blockedPermissions ?? [])];
  if (!dev) blocked.push('android.permission.INTERNET');
  return {
    ...config,
    android: {
      ...config.android,
      versionCode: androidVersionCode(config.version),
      blockedPermissions: blocked,
    },
    plugins: [...(config.plugins ?? []), './plugins/withReleaseSigning'],
  };
};
