import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Approximate coordinates for common destinations
const locationCoords: Record<string, { lat: number; lon: number }> = {
  denver: { lat: 39.7392, lon: -104.9903 },
  colorado: { lat: 39.5501, lon: -105.7821 },
  "new york": { lat: 40.7128, lon: -74.006 },
  "san francisco": { lat: 37.7749, lon: -122.4194 },
  london: { lat: 51.5074, lon: -0.1278 },
  paris: { lat: 48.8566, lon: 2.3522 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destination } = await req.json();
    console.log("Fetching weather for:", destination);

    // Get coordinates (default to Denver if not found)
    const normalizedDest = destination.toLowerCase();
    const coords = locationCoords[normalizedDest] || locationCoords["colorado"];

    // Call Open-Meteo API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=7`;

    const response = await fetch(weatherUrl);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Map weather codes to conditions
    const weatherCodeMap: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Foggy",
      51: "Light rain",
      53: "Moderate rain",
      55: "Heavy rain",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Rain showers",
      95: "Thunderstorm",
    };

    // Process forecast data
    const forecast = data.daily.time.slice(0, 7).map((date: string, i: number) => ({
      date,
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
      condition: weatherCodeMap[data.daily.weathercode[i]] || "Unknown",
      weatherCode: data.daily.weathercode[i],
    }));

    console.log("Weather forecast:", forecast);

    return new Response(
      JSON.stringify({ forecast, location: destination }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get-weather function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        forecast: [], // Return empty forecast on error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
