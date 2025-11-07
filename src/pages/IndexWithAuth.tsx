import { useState, useEffect } from "react";
import { Plane, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import AgentMessage from "@/components/AgentMessage";
import ThinkingProcess from "@/components/ThinkingProcess";
import TravelItinerary from "@/components/TravelItinerary";
import ConversationSidebar from "@/components/ConversationSidebar";

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string[];
  itinerary?: any;
}

const IndexWithAuth = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(
      data.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        thinking: msg.thinking as string[] | undefined,
        itinerary: msg.itinerary,
      }))
    );
    setCurrentConversationId(conversationId);
  };

  const createNewConversation = async (title: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }

    return data.id;
  };

  const saveMessage = async (conversationId: string, message: Message) => {
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      thinking: message.thinking,
      itinerary: message.itinerary,
    });

    if (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsLoading(true);

    try {
      // Create or use existing conversation
      let conversationId = currentConversationId;
      if (!conversationId) {
        const title = userInput.slice(0, 50) + (userInput.length > 50 ? "..." : "");
        conversationId = await createNewConversation(title);
        setCurrentConversationId(conversationId);
      }

      // Save user message
      await saveMessage(conversationId, userMessage);

      // Call edge function
      const { data, error } = await supabase.functions.invoke("plan-trip", {
        body: { prompt: userInput },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        thinking: data.thinking,
        itinerary: data.itinerary,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save assistant message
      await saveMessage(conversationId, assistantMessage);

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
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

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gradient-hero">
      <ConversationSidebar
        currentConversationId={currentConversationId}
        onSelectConversation={loadConversation}
        onNewConversation={handleNewConversation}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="container mx-auto px-4 py-8 max-w-5xl flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          {!currentConversationId && messages.length === 0 && (
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
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-8">
            {messages.length > 0 && (
              <div className="space-y-6">
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
          </div>

          {/* Input Form */}
          <Card className="p-6 shadow-glow">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-4">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your dream trip... (e.g., 'Plan a 3-day hiking adventure in Paris with good weather')"
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
    </div>
  );
};

export default IndexWithAuth;