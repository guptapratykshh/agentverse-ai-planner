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
    const { destination, interests } = await req.json();
    console.log("Fetching POIs for:", destination, "interests:", interests);

    // Get coordinates (default to Colorado if not found)
    const normalizedDest = destination.toLowerCase();
    const coords = locationCoords[normalizedDest] || locationCoords["colorado"];

    // Build Overpass QL query based on interests
    const radius = 20000; // 20km radius
    let query = `[out:json][timeout:25];(`;

    // Add hiking trails
    if (interests.includes("hiking") || interests.includes("nature")) {
      query += `way["route"="hiking"](around:${radius},${coords.lat},${coords.lon});`;
      query += `way["natural"="wood"](around:${radius},${coords.lat},${coords.lon});`;
      query += `node["natural"="peak"](around:${radius},${coords.lat},${coords.lon});`;
    }

    // Add restaurants
    if (interests.includes("food") || interests.includes("dining")) {
      query += `node["amenity"="restaurant"](around:${radius},${coords.lat},${coords.lon});`;
      query += `node["amenity"="cafe"](around:${radius},${coords.lat},${coords.lon});`;
    }

    // Add tourism spots
    if (interests.includes("sightseeing") || interests.includes("tourism")) {
      query += `node["tourism"="attraction"](around:${radius},${coords.lat},${coords.lon});`;
      query += `node["tourism"="viewpoint"](around:${radius},${coords.lat},${coords.lon});`;
    }

    query += `);out body 20;`;

    console.log("Overpass query:", query);

    // Call Overpass API
    const overpassUrl = "https://overpass-api.de/api/interpreter";
    const response = await fetch(overpassUrl, {
      method: "POST",
      body: query,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    // Process POIs
    const pois = data.elements.map((element: any) => ({
      id: element.id,
      name: element.tags?.name || "Unnamed location",
      type:
        element.tags?.route ||
        element.tags?.natural ||
        element.tags?.amenity ||
        element.tags?.tourism ||
        "point of interest",
      lat: element.lat || element.center?.lat,
      lon: element.lon || element.center?.lon,
      description: element.tags?.description || "",
    }));

    console.log(`Found ${pois.length} POIs`);

    return new Response(
      JSON.stringify({ pois, location: destination }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get-poi function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        pois: [], // Return empty POIs on error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
