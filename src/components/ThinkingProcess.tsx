import { Card } from "@/components/ui/card";
import { Brain, CheckCircle2 } from "lucide-react";

interface ThinkingProcessProps {
  steps: string[];
}

const ThinkingProcess = ({ steps }: ThinkingProcessProps) => {
  return (
    <Card className="p-6 mt-4 bg-agent-thinking/50 border-agent-thinking shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <Brain className="w-5 h-5 text-agent-thinking-foreground" />
        <h3 className="font-semibold text-agent-thinking-foreground">
          Agent's Reasoning Process
        </h3>
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="text-agent-thinking-foreground/90 text-sm leading-relaxed">
              {step}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ThinkingProcess;
