
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, Brain } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export type AIProvider = 'openai' | 'claude' | 'google';

interface AISelectorProps {
  selectedAI: AIProvider;
  onAIChange: (ai: AIProvider) => void;
}

const aiOptions = [
  {
    id: 'openai' as AIProvider,
    name: 'ChatGPT',
    description: 'GPT-4o Mini - Rápido e versátil',
    icon: Bot,
    color: 'bg-green-500',
    badge: 'Padrão'
  },
  {
    id: 'claude' as AIProvider,
    name: 'Claude',
    description: 'Claude 3 Haiku - Analítico e preciso',
    icon: Brain,
    color: 'bg-orange-500',
    badge: 'Avançado'
  },
  {
    id: 'google' as AIProvider,
    name: 'Gemini',
    description: 'Gemini 1.5 Flash - Para texto e Stream',
    icon: Zap,
    color: 'bg-blue-500',
    badge: 'Stream'
  }
];

const AISelector = ({ selectedAI, onAIChange }: AISelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedOption = aiOptions.find(ai => ai.id === selectedAI);

  if (isMobile) {
    return (
      <div className="w-full">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between bg-zinc-900 border-zinc-700 text-umind-gray"
        >
          <div className="flex items-center space-x-2">
            {selectedOption && <selectedOption.icon className="w-4 h-4" />}
            <span>{selectedOption?.name}</span>
            <Badge variant="secondary" className={`text-xs ${selectedOption?.color} text-white`}>
              {selectedOption?.badge}
            </Badge>
          </div>
        </Button>
        
        {isOpen && (
          <div className="mt-2 space-y-2">
            {aiOptions.map((ai) => (
              <Card 
                key={ai.id}
                className={`cursor-pointer transition-colors ${
                  selectedAI === ai.id 
                    ? 'bg-zinc-800 border-umind-purple' 
                    : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800'
                }`}
                onClick={() => {
                  onAIChange(ai.id);
                  setIsOpen(false);
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <ai.icon className="w-5 h-5 text-umind-gray" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-umind-gray">{ai.name}</h3>
                        <Badge variant="secondary" className={`text-xs ${ai.color} text-white`}>
                          {ai.badge}
                        </Badge>
                      </div>
                      <p className="text-xs text-umind-gray/70 truncate">{ai.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      {aiOptions.map((ai) => (
        <Button
          key={ai.id}
          variant={selectedAI === ai.id ? "default" : "outline"}
          size="sm"
          onClick={() => onAIChange(ai.id)}
          className={`
            ${selectedAI === ai.id 
              ? 'bg-umind-gradient text-white' 
              : 'bg-zinc-900 border-zinc-700 text-umind-gray hover:bg-zinc-800'
            }
          `}
        >
          <ai.icon className="w-4 h-4 mr-2" />
          <span>{ai.name}</span>
          <Badge variant="secondary" className={`ml-2 text-xs ${ai.color} text-white`}>
            {ai.badge}
          </Badge>
        </Button>
      ))}
    </div>
  );
};

export default AISelector;
