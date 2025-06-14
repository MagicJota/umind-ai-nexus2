
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Brain, Code, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export type AIProvider = 'openai' | 'claude' | 'google';

interface AISelectorProps {
  selectedAI: AIProvider;
  onAIChange: (ai: AIProvider) => void;
}

const aiOptions = [
  {
    id: 'openai' as AIProvider,
    name: 'Chat',
    description: 'Para conversas rápidas e respostas ágeis',
    icon: MessageCircle,
    color: 'bg-green-500',
    badge: 'Rápido'
  },
  {
    id: 'claude' as AIProvider,
    name: 'Think',
    description: 'Para análises profundas e raciocínio complexo',
    icon: Brain,
    color: 'bg-purple-500',
    badge: 'Avançado'
  },
  {
    id: 'google' as AIProvider,
    name: 'Code',
    description: 'Para programação e desenvolvimento',
    icon: Code,
    color: 'bg-blue-500',
    badge: 'Dev'
  }
];

const AISelector = ({ selectedAI, onAIChange }: AISelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedOption = aiOptions.find(ai => ai.id === selectedAI);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-zinc-900 border-zinc-700 text-umind-gray hover:bg-zinc-800 flex items-center space-x-2"
      >
        {selectedOption && <selectedOption.icon className="w-4 h-4" />}
        <span>{selectedOption?.name}</span>
        <ChevronDown className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg">
          {aiOptions.map((ai) => (
            <div
              key={ai.id}
              className={`p-3 cursor-pointer transition-colors hover:bg-zinc-800 ${
                selectedAI === ai.id ? 'bg-zinc-800' : ''
              }`}
              onClick={() => {
                onAIChange(ai.id);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center space-x-3">
                <ai.icon className="w-4 h-4 text-umind-gray" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-umind-gray">{ai.name}</span>
                    <Badge variant="secondary" className={`text-xs ${ai.color} text-white`}>
                      {ai.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-umind-gray/70">{ai.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AISelector;
