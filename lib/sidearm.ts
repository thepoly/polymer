// RPI Athletics and both conferences publish through Sidearm. None of it is an
// official API, so every request says who is asking, is cached for an hour and
// gives up after eight seconds.
export const SPORTS_USER_AGENT = 'The Polytechnic (poly.rpi.edu) sports desk'

const REFRESH_SECONDS = 60 * 60
const TIMEOUT_MS = 8000

export const fetchSidearm = (url: string) =>
  fetch(url, {
    headers: { 'User-Agent': SPORTS_USER_AGENT },
    next: { revalidate: REFRESH_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
