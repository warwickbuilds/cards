/**
 * Android versionCode from the app version: major × 10,000 + minor × 100 + patch,
 * so 0.2.0 → 200 and 1.2.3 → 10203. Android only installs an update whose
 * versionCode is higher, so minor and patch must stay below 100.
 */
function androidVersionCode(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version ?? '').trim());
  if (!m) throw new Error(`App version "${version}" must look like 1.2.3`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (minor > 99 || patch > 99) throw new Error(`Minor and patch must be below 100 (got ${version})`);
  return major * 10000 + minor * 100 + patch;
}

module.exports = { androidVersionCode };
