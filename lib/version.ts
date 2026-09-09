import pkg from '@/package.json'

/**
 * The running version, taken from package.json so there is one place to bump.
 */
export const APP_VERSION: string = pkg.version

/**
 * Every major version carries a name, and that name stays put for the whole
 * major line — 1.0.0, 1.1.0 and 1.14.3 are all "Indigo". Shipping a new major
 * means adding one entry here.
 */
export const MAJOR_VERSION_NAMES: Record<number, string> = {
  1: 'Indigo',
}

/** The major component of a semver string, or null if it is unparseable. */
export function getMajorVersion(version: string = APP_VERSION): number | null {
  const major = Number.parseInt(version.split('.')[0] ?? '', 10)
  return Number.isFinite(major) ? major : null
}

/**
 * The name for a version's major line. Null for a major we have not named yet,
 * so callers can fall back to showing the bare number rather than inventing
 * one.
 */
export function getVersionName(version: string = APP_VERSION): string | null {
  const major = getMajorVersion(version)
  return major === null ? null : (MAJOR_VERSION_NAMES[major] ?? null)
}

/**
 * How the version reads in the UI: "v1.1.0 “Indigo”", or just "v1.1.0" while a
 * major is unnamed.
 */
export function getVersionLabel(version: string = APP_VERSION): string {
  const name = getVersionName(version)
  return name ? `v${version} “${name}”` : `v${version}`
}
