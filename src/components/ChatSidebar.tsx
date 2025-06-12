
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Plus } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

const ChatSidebar = () => {
  const [conversations] = useState<Conversation[]>([
    {
      id: "1",
      title: "Análise de vendas Q4",
      lastMessage: "Obrigado pela sua mensagem! Como assistente AI...",
      timestamp: new Date(),
    },
    {
      id: "2",
      title: "Estratégias de marketing",
      lastMessage: "Vamos discutir algumas estratégias...",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "3",
      title: "Relatório de performance",
      lastMessage: "Aqui está o relatório que você solicitou...",
      timestamp: new Date(Date.now() - 7200000),
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="p-4 space-y-3">
        <Button className="w-full bg-umind-gradient hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4 mr-2" />
          Novo Chat
        </Button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-umind-gray/60" />
          <Input
            placeholder="Buscar em Chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700 text-umind-gray placeholder:text-umind-gray/60"
          />
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-3 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors group"
            >
              <h3 className="text-sm font-medium text-umind-gray truncate">
                {conversation.title}
              </h3>
              <p className="text-xs text-umind-gray/60 truncate mt-1">
                {conversation.lastMessage}
              </p>
              <p className="text-xs text-umind-gray/40 mt-1">
                {conversation.timestamp.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-umind-gray/60 text-center">
          UMIND SALES AI Assistant
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
