import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentMessageProps {
  message: Message;
}

const AgentMessage = ({ message }: AgentMessageProps) => {
  const isUser = message.role === "user";

  return (
    <Card
      className={`p-6 shadow-card ${
        isUser ? "bg-secondary/50" : "bg-card"
      }`}
    >
      <div className="flex gap-4">
        <Avatar className={`w-10 h-10 ${isUser ? "bg-secondary" : "bg-gradient-primary"}`}>
          {isUser ? (
            <User className="w-5 h-5 text-secondary-foreground" />
          ) : (
            <Bot className="w-5 h-5 text-primary-foreground" />
          )}
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold mb-2 text-foreground">
            {isUser ? "You" : "Travel AI Agent"}
          </p>
          <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default AgentMessage;
