/**
 * Pure version parsing, comparison and GitHub release APK selection.
 *
 * app.json's expo.version ("0.2.0") is the single source of truth; releases
 * are tagged "v0.2.0" and Android's versionCode is derived in
 * plugins/versionCode.js.
 */

export type Version = [major: number, minor: number, patch: number];

/** Parses "0.3.0" or "v0.3.0". Returns null for anything else. */
export function parseVersion(text: string | null | undefined): Version | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec((text ?? '').trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareVersions(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/** The bits of a GitHub release the manual update check reads. */
export interface ReleaseInfo {
  tag_name: string;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name: string; browser_download_url: string }[];
}

export interface AvailableUpdate {
  version: string;
  /** Direct arm64 APK link when the release has one, otherwise the release page. */
  downloadUrl: string;
  pageUrl: string;
}

type ReleaseAsset = NonNullable<ReleaseInfo['assets']>[number];

/** Only allow HTTPS links pointing at github.com for the expected repository (if given). */
export function isTrustedReleaseUrl(url: string | null | undefined, repo?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') return false;
    if (!repo) return true;
    return parsed.pathname.toLowerCase().startsWith(`/${repo.toLowerCase()}/releases/`);
  } catch {
    return false;
  }
}

/**
 * Picks the arm64 APK for Pixel 10+ (arm64-v8a), falling back to any single
 * APK attached to a release.
 */
export function pickApk(assets: ReleaseInfo['assets']): ReleaseAsset | undefined {
  const apks = (assets ?? []).filter((a) => a.name.toLowerCase().endsWith('.apk'));
  return apks.find((a) => a.name.toLowerCase().endsWith('-arm64.apk')) ?? apks[0];
}

/** Returns the update to offer, or null when the installed version is current. */
export function availableUpdate(
  installed: string | null | undefined,
  release: ReleaseInfo,
  repo?: string | null,
): AvailableUpdate | null {
  if (release.draft || release.prerelease) return null;
  const latest = parseVersion(release.tag_name);
  const current = parseVersion(installed);
  if (!latest || !current || compareVersions(latest, current) <= 0) return null;
  if (!isTrustedReleaseUrl(release.html_url, repo)) return null;
  const apk = pickApk(release.assets);
  const candidateDownload = apk?.browser_download_url;
  const downloadUrl = isTrustedReleaseUrl(candidateDownload, repo) ? candidateDownload! : release.html_url;
  return {
    version: latest.join('.'),
    downloadUrl,
    pageUrl: release.html_url,
  };
}
