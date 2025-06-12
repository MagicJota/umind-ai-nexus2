
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import FileUpload from "@/components/FileUpload";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  files?: File[];
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Olá! Sou o assistente AI da UMIND SALES. Como posso ajudá-lo hoje? Você pode enviar textos, imagens, áudios, documentos ou qualquer arquivo que precise analisar.",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && selectedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue || "Arquivo(s) enviado(s)",
      role: "user",
      timestamp: new Date(),
      files: selectedFiles.length > 0 ? [...selectedFiles] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setSelectedFiles([]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      let responseContent = "Obrigado pela sua mensagem!";
      
      if (userMessage.files && userMessage.files.length > 0) {
        const fileTypes = userMessage.files.map(file => {
          if (file.type.startsWith('image/')) return 'imagem';
          if (file.type.startsWith('audio/')) return 'áudio';
          if (file.type.startsWith('video/')) return 'vídeo';
          if (file.type.includes('pdf')) return 'documento PDF';
          return 'documento';
        });
        
        responseContent = `Recebi ${userMessage.files.length} arquivo(s): ${fileTypes.join(', ')}. Como assistente AI da UMIND SALES, posso analisar estes arquivos para ajudá-lo com suas necessidades de vendas e análise de dados. ${userMessage.content !== "Arquivo(s) enviado(s)" ? `Sobre sua mensagem: "${userMessage.content}"` : ""} Como posso ser mais específico em minha análise?`;
      } else {
        responseContent = "Obrigado pela sua mensagem! Como assistente AI da UMIND SALES, estou aqui para ajudá-lo com suas necessidades de vendas e análise de dados. Como posso ser mais específico em minha assistência?";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-screen bg-umind-black flex">
      {/* Sidebar */}
      <ChatSidebar />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-zinc-800 flex items-center px-6">
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/1988c68c-7e04-415b-8f30-609f18924a6c.png" 
              alt="UMIND" 
              className="w-8 h-8"
            />
            <div>
              <h1 className="text-lg font-medium text-umind-gray">UMIND SALES AI</h1>
              <p className="text-xs text-umind-gray/60">Assistente Inteligente</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl px-4 py-3 max-w-xs">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-umind-gray/60 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-umind-gray/60 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-umind-gray/60 rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-zinc-800 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
            />
            
            {/* Message Input */}
            <div className="flex space-x-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-zinc-900 border-zinc-700 text-umind-gray placeholder:text-umind-gray/60"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputValue.trim() && selectedFiles.length === 0)}
                className="bg-umind-gradient hover:opacity-90 transition-opacity"
              >
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
