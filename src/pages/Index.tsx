import { useState } from "react";
import { Plane, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AgentMessage from "@/components/AgentMessage";
import ThinkingProcess from "@/components/ThinkingProcess";
import TravelItinerary from "@/components/TravelItinerary";

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string[];
  itinerary?: any;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("plan-trip", {
        body: { prompt: input },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        thinking: data.thinking,
        itinerary: data.itinerary,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error planning trip:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to plan your trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="text-center mb-12 pt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-6 shadow-glow">
            <Plane className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Agentverse Travel AI
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            An autonomous AI agent that plans, reasons, and creates your perfect journey
          </p>
        </header>

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-6 mb-8">
            {messages.map((message, index) => (
              <div key={index}>
                <AgentMessage message={message} />
                {message.thinking && <ThinkingProcess steps={message.thinking} />}
                {message.itinerary && <TravelItinerary itinerary={message.itinerary} />}
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-6 mb-8 shadow-card">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Agent is thinking and planning your trip...</span>
            </div>
          </Card>
        )}

        {/* Input Form */}
        <Card className="p-6 shadow-glow sticky bottom-8">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-4">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your dream trip... (e.g., 'Plan a 3-day hiking adventure near Denver with good weather')"
                className="min-h-[80px] resize-none"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="lg"
                disabled={isLoading || !input.trim()}
                className="self-end bg-gradient-primary hover:opacity-90 shadow-glow"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Index;
