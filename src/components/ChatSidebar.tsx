
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { FileText, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  onClose?: () => void;
  activeKnowledgeBases?: string[];
  onKnowledgeBasesChange?: (ids: string[]) => void;
}

const ChatSidebar = ({ onClose, activeKnowledgeBases = [], onKnowledgeBasesChange }: ChatSidebarProps) => {
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
  const isMobile = useIsMobile();

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationClick = () => {
    // Close sidebar on mobile when conversation is clicked
    if (isMobile && onClose) {
      onClose();
    }
  };

  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  const fetchKnowledgeBases = async () => {
    setLoadingKnowledge(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('id, title, description, status')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching knowledge bases:', error);
      } else {
        setKnowledgeBases(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const toggleKnowledgeBase = (id: string) => {
    if (!onKnowledgeBasesChange) return;
    
    const newActiveIds = activeKnowledgeBases.includes(id)
      ? activeKnowledgeBases.filter(kbId => kbId !== id)
      : [...activeKnowledgeBases, id];
    
    onKnowledgeBasesChange(newActiveIds);
  };

  return (
    <div className="w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 md:p-4 space-y-3">
        <Button 
          className="w-full bg-umind-gradient hover:opacity-90 transition-opacity h-11 md:h-10 text-sm md:text-base"
          onClick={handleConversationClick}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Chat
        </Button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-umind-gray/60" />
          <Input
            placeholder="Buscar em Chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-700 text-umind-gray placeholder:text-umind-gray/60 h-11 md:h-10 text-base md:text-sm"
          />
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Knowledge Bases Section */}
          <div className="mb-4">
            <div className="flex items-center space-x-2 px-3 py-2">
              <FileText className="w-4 h-4 text-umind-purple" />
              <h3 className="text-sm font-medium text-umind-gray">Bases de Conhecimento</h3>
              {activeKnowledgeBases.length > 0 && (
                <span className="text-xs bg-umind-purple/20 text-umind-purple px-2 py-1 rounded">
                  {activeKnowledgeBases.length} ativa{activeKnowledgeBases.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {loadingKnowledge ? (
              <div className="px-3 py-2 text-xs text-umind-gray/60">
                Carregando bases de conhecimento...
              </div>
            ) : knowledgeBases.length > 0 ? (
              <div className="space-y-1">
                {knowledgeBases.map((kb) => (
                  <div
                    key={kb.id}
                    className="p-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors group flex items-start space-x-2"
                    onClick={() => toggleKnowledgeBase(kb.id)}
                  >
                    <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center ${
                      activeKnowledgeBases.includes(kb.id)
                        ? 'bg-umind-purple border-umind-purple'
                        : 'border-zinc-600'
                    }`}>
                      {activeKnowledgeBases.includes(kb.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-umind-gray truncate">
                        {kb.title}
                      </h4>
                      {kb.description && (
                        <p className="text-xs text-umind-gray/60 truncate mt-0.5">
                          {kb.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-2 text-xs text-umind-gray/60">
                Nenhuma base de conhecimento disponível
              </div>
            )}
          </div>

          <Separator className="bg-zinc-800 mb-4" />

          {/* Conversations */}
          <div className="space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="p-3 md:p-3 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors group min-h-[60px] md:min-h-[auto]"
                onClick={handleConversationClick}
              >
                <h3 className="text-sm md:text-sm font-medium text-umind-gray truncate">
                  {conversation.title}
                </h3>
                <p className="text-xs md:text-xs text-umind-gray/60 truncate mt-1 leading-relaxed">
                  {conversation.lastMessage}
                </p>
                <p className="text-xs md:text-xs text-umind-gray/40 mt-1">
                  {conversation.timestamp.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 md:p-4 border-t border-zinc-800">
        <div className="text-xs text-umind-gray/60 text-center">
          MAGUS AI Assistant
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
