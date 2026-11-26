import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { availableUpdate, compareVersions, isTrustedReleaseUrl, parseVersion, pickApk } from '../version';

describe('parseVersion', () => {
  it('reads plain and tag forms', () => {
    expect(parseVersion('0.2.0')).toEqual([0, 2, 0]);
    expect(parseVersion('v1.12.4')).toEqual([1, 12, 4]);
  });
  it('rejects anything else', () => {
    expect(parseVersion('1.2')).toBeNull();
    expect(parseVersion('v1.2.3-beta')).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
  });
});

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions([0, 10, 0], [0, 9, 0])).toBeGreaterThan(0);
    expect(compareVersions([1, 0, 0], [1, 0, 0])).toBe(0);
    expect(compareVersions([0, 2, 9], [0, 3, 0])).toBeLessThan(0);
  });
});

describe('availableUpdate', () => {
  const repo = 'warwickbuilds/cards';
  const release = {
    tag_name: 'v0.3.0',
    html_url: 'https://github.com/warwickbuilds/cards/releases/tag/v0.3.0',
    assets: [
      { name: 'notes.txt', browser_download_url: 'https://github.com/warwickbuilds/cards/releases/download/v0.3.0/notes.txt' },
      {
        name: 'cards-0.3.0-arm64.apk',
        browser_download_url: 'https://github.com/warwickbuilds/cards/releases/download/v0.3.0/cards-0.3.0-arm64.apk',
      },
    ],
  };

  it('offers a newer release with its arm64 APK link', () => {
    expect(availableUpdate('0.2.0', release, repo)).toEqual({
      version: '0.3.0',
      downloadUrl: 'https://github.com/warwickbuilds/cards/releases/download/v0.3.0/cards-0.3.0-arm64.apk',
      pageUrl: release.html_url,
    });
  });

  it('falls back to the release page without an APK', () => {
    expect(availableUpdate('0.2.0', { ...release, assets: [] }, repo)?.downloadUrl).toBe(release.html_url);
  });

  it('stays quiet when current, older, draft or prerelease', () => {
    expect(availableUpdate('0.3.0', release, repo)).toBeNull();
    expect(availableUpdate('0.4.0', release, repo)).toBeNull();
    expect(availableUpdate('0.2.0', { ...release, prerelease: true }, repo)).toBeNull();
    expect(availableUpdate('0.2.0', { ...release, draft: true }, repo)).toBeNull();
    expect(availableUpdate(null, release, repo)).toBeNull();
  });

  it('rejects untrusted or non-HTTPS URLs', () => {
    expect(isTrustedReleaseUrl('http://github.com/warwickbuilds/cards/releases/tag/v0.3.0', repo)).toBe(false);
    expect(isTrustedReleaseUrl('https://evil.example/warwickbuilds/cards/releases/tag/v0.3.0', repo)).toBe(false);
    expect(isTrustedReleaseUrl('https://github.com/other/repo/releases/tag/v0.3.0', repo)).toBe(false);
    expect(availableUpdate('0.2.0', { ...release, html_url: 'https://evil.example/x' }, repo)).toBeNull();
    // Untrusted asset download URL falls back safely to the verified release page.
    const badAsset = {
      ...release,
      assets: [{ name: 'cards-0.3.0-arm64.apk', browser_download_url: 'https://evil.example/evil.apk' }],
    };
    expect(availableUpdate('0.2.0', badAsset, repo)?.downloadUrl).toBe(release.html_url);
  });
});

describe('pickApk', () => {
  const arm64 = { name: 'cards-0.2.0-arm64.apk', browser_download_url: 'https://github.com/o/r/releases/download/v0.2.0/arm64.apk' };
  const universal = {
    name: 'cards-0.1.1-universal.apk',
    browser_download_url: 'https://github.com/o/r/releases/download/v0.1.1/universal.apk',
  };

  it('prefers the arm64 APK over other APKs', () => {
    expect(pickApk([universal, arm64])).toBe(arm64);
  });

  it('falls back to a single APK when no -arm64 suffix is present', () => {
    expect(pickApk([universal])).toBe(universal);
  });
});

// Only src/lib/updates.ts is allowed to call fetch(), and only for manual update checks.
it('no file in src other than src/lib/updates.ts calls fetch or XMLHttpRequest', () => {
  const root = join(__dirname, '..', '..');
  const allowed = join(root, 'lib', 'updates.ts');
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(name) && p !== allowed) {
        const src = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
        if (/\b(fetch|XMLHttpRequest|WebSocket)\b/.test(src)) offenders.push(p);
      }
    }
  };
  walk(root);
  expect(offenders).toEqual([]);
});
