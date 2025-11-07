import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Cloud, Sun, CloudRain, Snowflake, Wind } from "lucide-react";

interface ItineraryDay {
  day: number;
  date: string;
  weather?: {
    condition: string;
    temp: number;
    description: string;
  };
  activities: Array<{
    time: string;
    activity: string;
    location?: string;
    details?: string;
  }>;
}

interface TravelItineraryProps {
  itinerary: {
    destination: string;
    duration: string;
    days: ItineraryDay[];
    budget?: string;
    recommendations?: string[];
  };
}

const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes("sun") || lower.includes("clear")) return Sun;
  if (lower.includes("rain")) return CloudRain;
  if (lower.includes("snow")) return Snowflake;
  if (lower.includes("wind")) return Wind;
  return Cloud;
};

const TravelItinerary = ({ itinerary }: TravelItineraryProps) => {
  return (
    <Card className="p-6 mt-4 shadow-glow">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{itinerary.destination}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-sm">
            <Calendar className="w-3 h-3 mr-1" />
            {itinerary.duration}
          </Badge>
          {itinerary.budget && (
            <Badge variant="outline" className="text-sm">
              Budget: {itinerary.budget}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {itinerary.days.map((day) => {
          const WeatherIcon = day.weather ? getWeatherIcon(day.weather.condition) : Cloud;
          
          return (
            <Card key={day.day} className="p-5 bg-secondary/30">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Day {day.day}
                  </h3>
                  <p className="text-sm text-muted-foreground">{day.date}</p>
                </div>
                {day.weather && (
                  <div className="flex items-center gap-2 text-sm">
                    <WeatherIcon className="w-4 h-4 text-accent" />
                    <span className="font-medium">{day.weather.temp}°C</span>
                    <span className="text-muted-foreground">{day.weather.condition}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {day.activities.map((activity, index) => (
                  <div key={index} className="flex gap-3 pl-4 border-l-2 border-primary/30">
                    <div className="shrink-0 w-16 text-sm font-medium text-primary">
                      {activity.time}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{activity.activity}</p>
                      {activity.location && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {activity.location}
                        </p>
                      )}
                      {activity.details && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {itinerary.recommendations && itinerary.recommendations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="font-semibold text-foreground mb-3">Pro Tips</h3>
          <ul className="space-y-2">
            {itinerary.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-accent">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default TravelItinerary;
