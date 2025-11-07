import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Plus, MessageSquare, Trash2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

const ConversationSidebar = ({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { toast } = useToast();

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    setConversations(data || []);
  };

  useEffect(() => {
    loadConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
      return;
    }

    if (currentConversationId === id) {
      onNewConversation();
    }

    toast({
      title: "Success",
      description: "Conversation deleted",
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen">
      <div className="p-4 border-b border-border">
        <Button
          onClick={onNewConversation}
          className="w-full bg-gradient-primary hover:opacity-90"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                currentConversationId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDelete(conv.id, e)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full"
          size="sm"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default ConversationSidebar;