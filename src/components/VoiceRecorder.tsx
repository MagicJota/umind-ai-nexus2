
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Mic, MicOff, Square } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface VoiceRecorderProps {
  onVoiceMessage: (audioBlob: Blob) => void;
  disabled?: boolean;
}

const VoiceRecorder = ({ onVoiceMessage, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        onVoiceMessage(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Gravação iniciada",
        description: "Fale sua mensagem...",
      });
    } catch (error) {
      toast({
        title: "Erro no microfone",
        description: "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-2">
      {isRecording && (
        <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-red-400 font-mono">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}
      
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        size="icon"
        variant={isRecording ? "destructive" : "outline"}
        className={`${
          isRecording 
            ? "bg-red-500 hover:bg-red-600 text-white" 
            : "border-zinc-700 text-umind-gray hover:bg-zinc-800"
        } ${isMobile ? 'h-11 w-11' : 'h-10 w-10'}`}
      >
        {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>
    </div>
  );
};

export default VoiceRecorder;
