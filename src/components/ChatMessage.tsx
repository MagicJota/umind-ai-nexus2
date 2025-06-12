
interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex space-x-3 max-w-2xl">
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-umind-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">AI</span>
          </div>
        )}
        
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
