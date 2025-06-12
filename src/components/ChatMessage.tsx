
import { Card, CardContent } from "@/components/ui/card";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  files?: File[];
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex space-x-3 max-w-2xl">
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-umind-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">AI</span>
          </div>
        )}
        
        <div className="space-y-2">
          {/* Files */}
          {message.files && message.files.length > 0 && (
            <div className="space-y-2">
              {message.files.map((file, index) => (
                <Card key={index} className={`${isUser ? "bg-zinc-700" : "bg-zinc-800"} border-zinc-600`}>
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getFileIcon(file.type)}</span>
                      <div>
                        <p className="text-sm text-umind-gray font-medium">{file.name}</p>
                        <p className="text-xs text-umind-gray/60">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Message Text */}
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? "bg-umind-gradient text-white"
                : "bg-zinc-800 text-umind-gray"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <p className={`text-xs mt-2 ${isUser ? "text-white/70" : "text-umind-gray/60"}`}>
              {message.timestamp.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <span className="text-umind-gray text-xs font-medium">U</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
