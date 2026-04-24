import { unstable_cache } from 'next/cache'

// Troy, NY
const LAT = 42.7284
const LON = -73.6918
const UA = 'polymer-polytechnic (editor@poly.rpi.edu)'

export type CurrentWeather = {
  temperature: number
  unit: 'F' | 'C'
  shortForecast: string
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/geo+json' } })
  if (!res.ok) throw new Error(`NWS ${res.status}`)
  return res.json()
}

const fetchWeather = unstable_cache(
  async (): Promise<CurrentWeather | null> => {
    try {
      const points = (await fetchJson(`https://api.weather.gov/points/${LAT},${LON}`)) as {
        properties?: { forecastHourly?: string }
      }
      const forecastUrl = points?.properties?.forecastHourly
      if (!forecastUrl) return null
      const forecast = (await fetchJson(forecastUrl)) as {
        properties?: { periods?: Array<{ temperature?: number; temperatureUnit?: string; shortForecast?: string }> }
      }
      const p = forecast?.properties?.periods?.[0]
      if (!p || typeof p.temperature !== 'number') return null
      const unit: 'F' | 'C' = p.temperatureUnit === 'C' ? 'C' : 'F'
      return {
        temperature: p.temperature,
        unit,
        shortForecast: typeof p.shortForecast === 'string' ? p.shortForecast : '',
      }
    } catch {
      return null
    }
  },
  ['polymer-weather-troy'],
  { revalidate: 600, tags: ['polymer-weather'] },
)

export const getWeather = fetchWeather
