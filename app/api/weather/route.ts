import { NextResponse } from "next/server";

const USER_AGENT = "dev.poly.rpi.edu (tech@poly.rpi.edu)";
const RPI_POINT = {
  latitude: 42.7295,
  longitude: -73.6788,
};

type NWSPointResponse = {
  properties?: {
    forecastHourly?: string;
    observationStations?: string;
    relativeLocation?: {
      properties?: {
        city?: string;
        state?: string;
      };
    };
  };
};

type NWSStationCollection = {
  features?: Array<{
    id?: string;
    properties?: {
      stationIdentifier?: string;
      name?: string;
    };
  }>;
};

type NWSObservationResponse = {
  properties?: {
    textDescription?: string | null;
    timestamp?: string;
    temperature?: {
      value?: number | null;
    };
    stationId?: string;
    stationName?: string;
  };
};

type NWSHourlyForecastResponse = {
  properties?: {
    periods?: Array<{
      startTime?: string;
      shortForecast?: string;
      temperature?: number;
      temperatureUnit?: string;
    }>;
  };
};

const responseHeaders = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
};

const toFahrenheit = (celsius: number) => Math.round((celsius * 9) / 5 + 32);

async function fetchNWS<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 600 },
  });

  if (!response.ok) {
    throw new Error(`NWS request failed for ${url} with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function GET() {
  try {
    const point = await fetchNWS<NWSPointResponse>(
      `https://api.weather.gov/points/${RPI_POINT.latitude},${RPI_POINT.longitude}`,
    );

    const city = point.properties?.relativeLocation?.properties?.city || "Troy";
    const state = point.properties?.relativeLocation?.properties?.state || "NY";
    const stationsURL = point.properties?.observationStations;
    const forecastHourlyURL = point.properties?.forecastHourly;

    if (stationsURL) {
      const stations = await fetchNWS<NWSStationCollection>(stationsURL);
      const nearestStation = stations.features?.[0];

      if (nearestStation?.id) {
        const observation = await fetchNWS<NWSObservationResponse>(
          `${nearestStation.id}/observations/latest`,
        );

        const temperatureC = observation.properties?.temperature?.value;
        const description = observation.properties?.textDescription?.trim();

        if (typeof temperatureC === "number" && description) {
          return NextResponse.json(
            {
              available: true,
              city,
              state,
              shortForecast: description,
              temperature: toFahrenheit(temperatureC),
              temperatureUnit: "F",
              stationId:
                observation.properties?.stationId ||
                nearestStation.properties?.stationIdentifier ||
                null,
              stationName:
                observation.properties?.stationName ||
                nearestStation.properties?.name ||
                null,
              source: "observation",
              fetchedAt: observation.properties?.timestamp || new Date().toISOString(),
            },
            {
              headers: responseHeaders,
            },
          );
        }
      }
    }

    if (forecastHourlyURL) {
      const forecast = await fetchNWS<NWSHourlyForecastResponse>(forecastHourlyURL);
      const currentPeriod = forecast.properties?.periods?.[0];

      if (
        currentPeriod?.shortForecast &&
        typeof currentPeriod.temperature === "number" &&
        currentPeriod.temperatureUnit === "F"
      ) {
        return NextResponse.json(
          {
            available: true,
            city,
            state,
            shortForecast: currentPeriod.shortForecast,
            temperature: Math.round(currentPeriod.temperature),
            temperatureUnit: currentPeriod.temperatureUnit,
            stationId: null,
            stationName: null,
            source: "forecast",
            fetchedAt: currentPeriod.startTime || new Date().toISOString(),
          },
          {
            headers: responseHeaders,
          },
        );
      }
    }

    return NextResponse.json(
      {
        available: false,
        city,
        state,
      },
      {
        headers: responseHeaders,
      },
    );
  } catch (error) {
    console.error("Failed to fetch NWS weather", error);

    return NextResponse.json(
      {
        available: false,
        city: "Troy",
        state: "NY",
      },
      {
        headers: responseHeaders,
      },
    );
  }
}
