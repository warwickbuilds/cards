const { androidVersionCode } = require('../versionCode');
const { addReleaseSigning } = require('../withReleaseSigning');
const { addAbiSplits } = require('../withAbiSplits');

describe('androidVersionCode', () => {
  it('always goes up with the version', () => {
    expect(androidVersionCode('0.2.0')).toBe(200);
    expect(androidVersionCode('1.2.3')).toBe(10203);
    expect(androidVersionCode('0.99.99')).toBeLessThan(androidVersionCode('1.0.0'));
  });
  it('refuses versions it cannot encode', () => {
    expect(() => androidVersionCode('0.100.0')).toThrow();
    expect(() => androidVersionCode('next')).toThrow();
  });
});

describe('addReleaseSigning', () => {
  const gradle = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}`;

  it('adds a release key read from the environment', () => {
    const out = addReleaseSigning(gradle);
    expect(out).toContain("storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))");
    expect(out).toContain(
      "signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug"
    );
    // Debug builds keep the debug key.
    expect(out).toMatch(/debug \{\s*signingConfig signingConfigs\.debug/);
  });
  it('runs only once', () => {
    const once = addReleaseSigning(gradle);
    expect(addReleaseSigning(once)).toBe(once);
  });
});

describe('addAbiSplits', () => {
  const gradle = `apply plugin: "com.android.application"

android {
    ndkVersion rootProject.ext.ndkVersion
    defaultConfig {
        versionCode 1
    }
}`;

  it('builds an arm64 APK and a universal APK', () => {
    const out = addAbiSplits(gradle);
    expect(out).toMatch(/android \{\n\s+splits \{/);
    expect(out).toContain("include 'arm64-v8a'");
    expect(out).toContain('universalApk true');
  });
  it('only adds the splits once', () => {
    expect(addAbiSplits(addAbiSplits(gradle))).toBe(addAbiSplits(gradle));
  });
  it('fails loudly when the template changes', () => {
    expect(() => addAbiSplits('plugins { }')).toThrow();
  });
});
