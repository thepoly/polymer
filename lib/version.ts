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

/**
 * What each release told staff on the way in. The splash on the newsroom
 * dashboard shows the entry for whatever version is running, so adding a
 * release means adding an entry here and nothing else.
 */
export type ReleaseNotes = {
  /** The line under the heading. Short, and specific to this release. */
  tagline: string
  notes: string[]
}

export const RELEASE_NOTES: Record<string, ReleaseNotes> = {
  '1.0.0': {
    tagline: 'Designed for the ENTIRE Polytechnic.',
    notes: [
      '/admin has moved to /newsroom. You can still get there via /admin — it redirects.',
      'One search bar for everything: articles, users, skeletons, layouts, media.',
      'All Poly members have Polymer accounts. The base permission is editing your own profile.',
    ],
  },
  '1.1.0': {
    tagline: 'Nobody gets their head cut off any more.',
    notes: [
      'Photo galleries and carousels finally credit their photographers. Credits sit on the photo, in whichever bottom corner is least busy, and switch between white and black to stay readable.',
      'Photo features now crop to the focal point of the lead image instead of the dead centre, so faces survive on tall and narrow screens.',
      'Because of that, publishing a photo feature now requires a focal point on the lead image. Open the image in Media, drag the marker onto the subject\u2019s face, and save. If centre framing really is right, tick \u201cCentre framing is intentional\u201d on the article.',
      'Staff profile pages load far faster \u2014 the ones with the most photos were the worst hit, and are now the biggest improvement.',
      'Releases have names now, and they stay put for a whole major version. This one is Indigo.',
    ],
  },
}

/** The notes for a version, or null if that release never wrote any. */
export function getReleaseNotes(version: string = APP_VERSION): ReleaseNotes | null {
  return RELEASE_NOTES[version] ?? null
}
