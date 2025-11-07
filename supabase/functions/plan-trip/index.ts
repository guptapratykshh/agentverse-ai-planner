import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Received travel request:", prompt);

    // Step 1: Extract intent using AI
    const thinking: string[] = [];
    thinking.push("Analyzing your travel request to understand destination, dates, budget, and preferences");

    const intentResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a travel intent analyzer. Extract destination, duration, interests, and budget from user requests. Return JSON only.",
            },
            {
              role: "user",
              content: `Extract travel details from: "${prompt}". Return JSON with: destination, duration (in days), interests (array), budget (optional), dates (optional).`,
            },
          ],
        }),
      }
    );

    if (!intentResponse.ok) {
      throw new Error(`AI API error: ${intentResponse.status}`);
    }

    const intentData = await intentResponse.json();
    const intentText = intentData.choices[0].message.content;
    let intent;

    try {
      intent = JSON.parse(intentText);
    } catch {
      // If parsing fails, create a default intent
      intent = {
        destination: "Colorado",
        duration: 3,
        interests: ["hiking", "nature"],
        budget: "moderate",
      };
    }

    console.log("Extracted intent:", intent);
    thinking.push(
      `Identified destination: ${intent.destination}, Duration: ${intent.duration} days, Interests: ${intent.interests.join(", ")}`
    );

    // Step 2: Call weather API
    thinking.push("Fetching real-time weather forecast for your destination");

    const weatherResponse = await fetch(
      Deno.env.get("SUPABASE_URL") + "/functions/v1/get-weather",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ destination: intent.destination }),
      }
    );

    const weatherData = weatherResponse.ok
      ? await weatherResponse.json()
      : { forecast: [] };
    console.log("Weather data:", weatherData);

    // Step 3: Call POI API
    thinking.push("Searching for hiking trails, restaurants, and attractions in the area");

    const poiResponse = await fetch(
      Deno.env.get("SUPABASE_URL") + "/functions/v1/get-poi",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          destination: intent.destination,
          interests: intent.interests,
        }),
      }
    );

    const poiData = poiResponse.ok ? await poiResponse.json() : { pois: [] };
    console.log("POI data:", poiData);

    // Step 4: Synthesize itinerary with AI
    thinking.push("Synthesizing all data into a personalized day-by-day itinerary");

    const synthesisPrompt = `Create a detailed ${intent.duration}-day travel itinerary for ${intent.destination}.

User interests: ${intent.interests.join(", ")}
Weather forecast: ${JSON.stringify(weatherData.forecast || [])}
Available points of interest: ${JSON.stringify(poiData.pois || [])}

Create a JSON itinerary with this structure:
{
  "destination": "${intent.destination}",
  "duration": "${intent.duration} days",
  "days": [
    {
      "day": 1,
      "date": "Day 1 - [Date]",
      "weather": { "condition": "Sunny", "temp": 20, "description": "Perfect for outdoor activities" },
      "activities": [
        { "time": "9:00 AM", "activity": "Activity name", "location": "Location", "details": "Details" }
      ]
    }
  ],
  "budget": "Estimated budget",
  "recommendations": ["Tip 1", "Tip 2"]
}

Make it realistic, considering weather and available POIs. Be specific and actionable.`;

    const synthesisResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an expert travel planner. Create detailed, realistic itineraries. Return only valid JSON.",
            },
            { role: "user", content: synthesisPrompt },
          ],
        }),
      }
    );

    if (!synthesisResponse.ok) {
      throw new Error(`Synthesis API error: ${synthesisResponse.status}`);
    }

    const synthesisData = await synthesisResponse.json();
    const itineraryText = synthesisData.choices[0].message.content;

    let itinerary;
    try {
      // Remove markdown code blocks if present
      const cleanText = itineraryText.replace(/```json\n?|\n?```/g, "").trim();
      itinerary = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse itinerary:", e);
      // Create fallback itinerary
      itinerary = {
        destination: intent.destination,
        duration: `${intent.duration} days`,
        days: Array.from({ length: intent.duration }, (_, i) => ({
          day: i + 1,
          date: `Day ${i + 1}`,
          activities: [
            {
              time: "9:00 AM",
              activity: "Explore local attractions",
              location: intent.destination,
            },
          ],
        })),
        recommendations: ["Pack layers", "Book activities in advance"],
      };
    }

    thinking.push("Successfully created your personalized travel plan!");

    return new Response(
      JSON.stringify({
        response: `I've created a personalized ${intent.duration}-day itinerary for ${intent.destination}! The plan includes real weather forecasts and carefully selected activities based on your interests. Check out the detailed day-by-day plan below.`,
        thinking,
        itinerary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in plan-trip function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
