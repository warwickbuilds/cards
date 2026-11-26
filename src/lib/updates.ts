/**
 * Manual-only "Check for updates" for sideloaded Android installs.
 *
 * Cards never checks the network automatically or in the background. Only when
 * the user taps "Check for updates" in Settings does this module make a single
 * unauthenticated GET to GitHub's public latest-release endpoint for this repo.
 * No card data, account, token or device identifier is ever sent.
 */

import Constants from 'expo-constants';

import { availableUpdate, type AvailableUpdate, type ReleaseInfo } from './version';

const REQUEST_TIMEOUT_MS = 10_000;

export const installedVersion = (): string | null => Constants.expoConfig?.version ?? null;

/** "owner/name" of the GitHub repo that publishes the APKs (app.json -> extra.releasesRepo). */
export const releasesRepo = (): string | null =>
  (Constants.expoConfig?.extra?.releasesRepo as string | undefined) ?? null;

export const repoUrl = (): string | null => {
  const repo = releasesRepo();
  return repo ? `https://github.com/${repo}` : null;
};

export type CheckResult =
  | { status: 'update'; update: AvailableUpdate }
  | { status: 'current' }
  | { status: 'unavailable' };

/** Asks GitHub for the latest release on explicit user request. Never throws. */
export async function checkForUpdate(): Promise<CheckResult> {
  const repo = releasesRepo();
  if (!repo) return { status: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) return { status: 'unavailable' };
    const update = availableUpdate(installedVersion(), (await res.json()) as ReleaseInfo, repo);
    return update ? { status: 'update', update } : { status: 'current' };
  } catch {
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
