
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import FileUpload from "@/components/FileUpload";
import VoiceRecorder from "@/components/VoiceRecorder";
import AISelector, { AIProvider } from "@/components/AISelector";
import StreamButton from "@/components/StreamButton";
import StreamInterface from "@/components/StreamInterface";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  files?: File[];
  provider?: string;
  model?: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Olá! Sou MAGUS, o assistente AI da UMIND SALES. Como posso ajudá-lo hoje? Você pode escolher entre ChatGPT, Claude ou Gemini, ou falar comigo ao vivo usando o modo Stream!",
      role: "assistant",
      timestamp: new Date(),
      provider: "system"
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AIProvider>('openai');
  const [isStreamOpen, setIsStreamOpen] = useState(false);
  const [activeKnowledgeBases, setActiveKnowledgeBases] = useState<string[]>([]);
  const [knowledgeContext, setKnowledgeContext] = useState<string>('');
  const isMobile = useIsMobile();

  const handleVoiceMessage = (audioBlob: Blob) => {
    // Convert blob to file
    const audioFile = new File([audioBlob], "voice-message.wav", {
      type: "audio/wav"
    });

    const userMessage: Message = {
      id: Date.now().toString(),
      content: "Mensagem de voz",
      role: "user",
      timestamp: new Date(),
      files: [audioFile],
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Close sidebar on mobile when sending voice message
    if (isMobile) {
      setSidebarOpen(false);
    }

    // Simulate AI response for voice message
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Recebi sua mensagem de voz! Como assistente AI da UMIND SALES, posso processar áudios para ajudá-lo com transcrições, análises de conteúdo e muito mais. Como posso ajudá-lo especificamente?",
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

  const getKnowledgeContext = async (query: string) => {
    if (activeKnowledgeBases.length === 0) return '';
    
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-search', {
        body: {
          query,
          knowledgeBaseIds: activeKnowledgeBases,
          userId: 'current-user-id' // This should come from auth
        }
      });

      if (error) {
        console.error('Knowledge search error:', error);
        return '';
      }

      return data?.context || '';
    } catch (error) {
      console.error('Error getting knowledge context:', error);
      return '';
    }
  };

  const callAIProvider = async (messages: Message[], context: string = '') => {
    const functionName = `chat-${selectedAI}`;
    console.log(`Calling ${functionName} with context:`, !!context);
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          knowledgeContext: context
        }
      });

      if (error) {
        console.error(`Error calling ${functionName}:`, error);
        throw new Error(error.message || `Erro na API ${selectedAI}`);
      }

      if (!data) {
        throw new Error('Resposta vazia da API');
      }

      console.log(`Response from ${functionName}:`, data);
      return data;
    } catch (error) {
      console.error(`Failed to call ${functionName}:`, error);
      throw error;
    }
  };

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

    // Close sidebar on mobile when sending message
    if (isMobile) {
      setSidebarOpen(false);
    }

    try {
      // Get knowledge context
      const context = await getKnowledgeContext(userMessage.content);
      setKnowledgeContext(context);

      // Process files if any
      if (userMessage.files && userMessage.files.length > 0) {
        for (const file of userMessage.files) {
          try {
            const fileContent = await fileToBase64(file);
            await supabase.functions.invoke('knowledge-upload', {
              body: {
                fileContent,
                fileName: file.name,
                fileType: file.type,
                title: `Upload: ${file.name}`,
                description: `Arquivo enviado pelo usuário: ${file.name}`,
                userId: 'current-user-id' // TODO: usar auth real
              }
            });
          } catch (error) {
            console.error('Error uploading file:', error);
          }
        }
      }

      // Call selected AI provider
      const allMessages = [...messages, userMessage];
      const aiResponse = await callAIProvider(allMessages, context);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.message || 'Resposta não disponível',
        role: "assistant",
        timestamp: new Date(),
        provider: aiResponse.provider,
        model: aiResponse.model
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = 'Erro desconhecido';
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ Erro: ${errorMessage}. Por favor, tente novamente.`,
        role: "assistant",
        timestamp: new Date(),
        provider: 'error'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:type/subtype;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="h-screen bg-umind-black flex w-full">
      {/* Mobile Sidebar with Sheet */}
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0 bg-zinc-950 border-zinc-800">
            <ChatSidebar 
              onClose={() => setSidebarOpen(false)}
              activeKnowledgeBases={activeKnowledgeBases}
              onKnowledgeBasesChange={setActiveKnowledgeBases}
            />
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop Sidebar */
        <ChatSidebar 
          activeKnowledgeBases={activeKnowledgeBases}
          onKnowledgeBasesChange={setActiveKnowledgeBases}
        />
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 md:h-16 border-b border-zinc-800 flex items-center px-4 md:px-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              {/* Mobile hamburger menu */}
              {isMobile && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden text-umind-gray hover:bg-zinc-800"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                </Sheet>
              )}
              
              <img 
                src="/lovable-uploads/1988c68c-7e04-415b-8f30-609f18924a6c.png" 
                alt="UMIND" 
                className="w-6 h-6 md:w-8 md:h-8"
              />
              <div>
                <h1 className="text-base md:text-lg font-medium text-umind-gray">MAGUS AI</h1>
                <p className="text-xs text-umind-gray/60 hidden md:block">Assistente Inteligente</p>
              </div>
            </div>

            {/* AI Selector */}
            <div className="flex items-center space-x-3">
              <AISelector 
                selectedAI={selectedAI}
                onAIChange={setSelectedAI}
              />
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-3 md:p-6">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl px-3 md:px-4 py-2 md:py-3 max-w-xs">
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
        <div className="border-t border-zinc-800 p-3 md:p-4 pb-safe">
          <div className="max-w-3xl mx-auto space-y-3 md:space-y-4">
            {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
            />
            
            {/* Message Input */}
            <div className="flex space-x-2 md:space-x-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-zinc-900 border-zinc-700 text-umind-gray placeholder:text-umind-gray/60 h-11 md:h-10 text-base md:text-sm"
                disabled={isLoading}
              />
              <VoiceRecorder
                onVoiceMessage={handleVoiceMessage}
                disabled={isLoading}
              />
              <StreamButton
                onStreamToggle={() => setIsStreamOpen(!isStreamOpen)}
                isStreaming={isStreamOpen}
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputValue.trim() && selectedFiles.length === 0)}
                className="bg-umind-gradient hover:opacity-90 transition-opacity h-11 md:h-10 px-4 md:px-6"
              >
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stream Interface */}
      <StreamInterface
        isOpen={isStreamOpen}
        onClose={() => setIsStreamOpen(false)}
        knowledgeContext={knowledgeContext}
      />
    </div>
  );
};

export default Chat;
