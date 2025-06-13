
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Zap } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface StreamButtonProps {
  onStreamToggle: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const StreamButton = ({ onStreamToggle, isStreaming, disabled }: StreamButtonProps) => {
  const isMobile = useIsMobile();

  return (
    <Button
      onClick={onStreamToggle}
      disabled={disabled}
      className={`
        ${isStreaming 
          ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
          : 'bg-umind-gradient hover:opacity-90'
        }
        transition-all duration-200
        ${isMobile ? 'h-12 px-4' : 'h-10 px-6'}
      `}
    >
      {isStreaming ? (
        <>
          <MicOff className="w-4 h-4 mr-2" />
          <span>Parar Stream</span>
        </>
      ) : (
        <>
          <Zap className="w-4 h-4 mr-2" />
          <span>Falar com MAGUS</span>
        </>
      )}
    </Button>
  );
};

export default StreamButton;
