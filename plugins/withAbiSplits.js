/**
 * Builds two release APKs instead of one:
 *
 *   app-arm64-v8a-release.apk  only the 64-bit ARM code, which nearly every
 *                              phone from the last several years runs
 *   app-universal-release.apk  code for every chip, for older 32-bit phones
 *                              and emulators
 *
 * Both have the same version code and signature, so a phone can move from
 * one to the other by installing over it. The in-app update check picks the
 * right one for the phone (src/lib/version.ts → pickApk).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// withAbiSplits';

const SPLITS = `
    splits { ${MARKER}
        abi {
            enable true
            reset()
            include 'arm64-v8a'
            universalApk true
        }
    }
`;

function addAbiSplits(gradle) {
  if (gradle.includes(MARKER)) return gradle;
  const androidBlock = /^android\s*\{\s*$/m;
  const match = androidBlock.exec(gradle);
  if (!match) throw new Error('withAbiSplits: no android { } block in app/build.gradle');
  const insertAt = match.index + match[0].length;
  return gradle.slice(0, insertAt) + SPLITS + gradle.slice(insertAt);
}

const withAbiSplits = (config) =>
  withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') throw new Error('withAbiSplits: expected a Groovy build.gradle');
    mod.modResults.contents = addAbiSplits(mod.modResults.contents);
    return mod;
  });

module.exports = withAbiSplits;
module.exports.addAbiSplits = addAbiSplits;
