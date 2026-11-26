// Adds values derived from app.json. Edit app.json for everything else.
// - android.versionCode comes from the version, so every release goes up.
// - Release APKs are signed with the key from GitHub secrets (plugins/withReleaseSigning.js).
const { androidVersionCode } = require('./plugins/versionCode');

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: androidVersionCode(config.version),
  },
  plugins: [...(config.plugins ?? []), './plugins/withReleaseSigning'],
});
