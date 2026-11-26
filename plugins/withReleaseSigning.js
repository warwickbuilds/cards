/**
 * Signs Android release builds with the app's own upload key instead of the
 * debug key that `expo prebuild` sets up.
 *
 * The key never lives in the repo. Gradle reads it at build time from these
 * environment variables (set by the release workflow from GitHub secrets):
 *
 *   ANDROID_KEYSTORE_PATH      path to the .jks file
 *   ANDROID_KEYSTORE_PASSWORD  keystore password
 *   ANDROID_KEY_ALIAS          key alias
 *   ANDROID_KEY_PASSWORD       key password
 *
 * When they are missing (a local release build), the build falls back to
 * the debug key, and that APK can't be installed over a published one.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// withReleaseSigning';

const RELEASE_SIGNING = `
        release { ${MARKER}
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }`;

function addReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  const signingStart = gradle.indexOf('signingConfigs {');
  if (signingStart === -1) throw new Error('withReleaseSigning: no signingConfigs block in app/build.gradle');
  const insertAt = signingStart + 'signingConfigs {'.length;
  gradle = gradle.slice(0, insertAt) + RELEASE_SIGNING + gradle.slice(insertAt);

  // Point the release build type at the release key when one is provided.
  const releaseType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseType.test(gradle)) throw new Error('withReleaseSigning: release build type not found in app/build.gradle');
  return gradle.replace(
    releaseType,
    "$1signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug"
  );
}

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') throw new Error('withReleaseSigning: expected a Groovy build.gradle');
    mod.modResults.contents = addReleaseSigning(mod.modResults.contents);
    return mod;
  });

module.exports = withReleaseSigning;
module.exports.addReleaseSigning = addReleaseSigning;
