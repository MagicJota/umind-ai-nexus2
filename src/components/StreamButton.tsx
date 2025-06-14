
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
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
      variant="outline"
      className={`
        ${isStreaming 
          ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white' 
          : 'bg-zinc-900 border-zinc-700 text-umind-gray hover:bg-zinc-800'
        }
        transition-all duration-200
        ${isMobile ? 'h-12 px-3' : 'h-10 px-4'}
      `}
    >
      <Zap className="w-4 h-4 mr-2" />
      <span>{isStreaming ? 'Parar' : 'Stream'}</span>
    </Button>
  );
};

export default StreamButton;
