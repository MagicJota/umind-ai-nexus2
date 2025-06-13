
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Eye, Download, Trash2, Users, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { KnowledgeUpload } from "./KnowledgeUpload";
import { UserAccessControl } from "./UserAccessControl";
import { useIsMobile } from "@/hooks/use-mobile";

interface KnowledgeBase {
  id: string;
  title: string;
  description: string | null;
  type: 'DOCUMENT' | 'FAQ' | 'MANUAL' | 'TRAINING' | 'REFERENCE';
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  is_public: boolean;
  creator_name?: string;
}

export function KnowledgeManagement() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<KnowledgeBase | null>(null);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const fetchKnowledgeBases = async () => {
    try {
      // First, get the knowledge bases
      const { data: kbData, error: kbError } = await supabase
        .from('knowledge_bases')
        .select('*')
        .order('created_at', { ascending: false });

      if (kbError) {
        console.error('Error fetching knowledge bases:', kbError);
        toast({
          title: "Erro",
          description: "Erro ao carregar bases de conhecimento",
          variant: "destructive",
        });
        return;
      }

      // Then get the profiles for creators
      const creatorIds = [...new Set(kbData?.map(kb => kb.created_by) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Map creator names to knowledge bases
      const formattedData = kbData?.map(kb => ({
        ...kb,
        creator_name: profilesData?.find(p => p.user_id === kb.created_by)?.full_name || 'Usuário desconhecido'
      })) || [];

      setKnowledgeBases(formattedData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (knowledgeId: string, newStatus: KnowledgeBase['status']) => {
    try {
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', knowledgeId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar status",
          variant: "destructive",
        });
      } else {
        setKnowledgeBases(prev => prev.map(kb => 
          kb.id === knowledgeId ? { ...kb, status: newStatus } : kb
        ));
        toast({
          title: "Status atualizado",
          description: `Status alterado para ${newStatus}`,
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (knowledgeId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta base de conhecimento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('knowledge_bases')
        .delete()
        .eq('id', knowledgeId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao excluir base de conhecimento",
          variant: "destructive",
        });
      } else {
        setKnowledgeBases(prev => prev.filter(kb => kb.id !== knowledgeId));
        toast({
          title: "Excluído",
          description: "Base de conhecimento excluída com sucesso",
        });
      }
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
    }
  };

  const getStatusBadge = (status: KnowledgeBase['status']) => {
    const variants = {
      ACTIVE: "bg-green-500",
      INACTIVE: "bg-gray-500",
      DRAFT: "bg-yellow-500",
      ARCHIVED: "bg-red-500",
    };
    
    const labels = {
      ACTIVE: "Ativo",
      INACTIVE: "Inativo",
      DRAFT: "Rascunho",
      ARCHIVED: "Arquivado",
    };

    return (
      <Badge className={`${variants[status]} text-white text-xs`}>
        {labels[status]}
      </Badge>
    );
  };

  const getTypeBadge = (type: KnowledgeBase['type']) => {
    const labels = {
      DOCUMENT: "Documento",
      FAQ: "FAQ",
      MANUAL: "Manual",
      TRAINING: "Treinamento",
      REFERENCE: "Referência",
    };

    return (
      <Badge variant="outline" className="text-xs">
        {labels[type]}
      </Badge>
    );
  };

  const filteredKnowledgeBases = knowledgeBases.filter(kb => {
    const matchesSearch = kb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kb.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kb.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || kb.type === typeFilter;
    const matchesStatus = statusFilter === "all" || kb.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-umind-gray">Carregando bases de conhecimento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="text-umind-gray">Gestão de Conhecimento ({knowledgeBases.length})</CardTitle>
              <CardDescription className="text-umind-gray/70">
                Gerencie bases de conhecimento e controle de acesso
              </CardDescription>
            </div>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 h-12 sm:h-10">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Base
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-umind-gray">Criar Nova Base de Conhecimento</DialogTitle>
                  <DialogDescription className="text-umind-gray/70">
                    Faça upload de documentos e configure o acesso
                  </DialogDescription>
                </DialogHeader>
                <KnowledgeUpload 
                  onSuccess={() => {
                    setIsUploadOpen(false);
                    fetchKnowledgeBases();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-umind-gray/50 w-4 h-4" />
              <Input
                placeholder="Buscar conhecimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-umind-gray"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-umind-gray">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="DOCUMENT">Documento</SelectItem>
                <SelectItem value="FAQ">FAQ</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="TRAINING">Treinamento</SelectItem>
                <SelectItem value="REFERENCE">Referência</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-umind-gray">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="ARCHIVED">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-umind-gray/70 text-sm flex items-center">
              {filteredKnowledgeBases.length} de {knowledgeBases.length} bases
            </div>
          </div>

          {/* Mobile Cards */}
          {isMobile ? (
            <div className="space-y-4">
              {filteredKnowledgeBases.map((kb) => (
                <Card key={kb.id} className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-umind-gray font-medium truncate">{kb.title}</h4>
                        <p className="text-umind-gray/70 text-sm truncate">{kb.description || 'Sem descrição'}</p>
                        <p className="text-umind-gray/60 text-xs">por {kb.creator_name}</p>
                      </div>
                      <div className="ml-2 space-y-1">
                        {getStatusBadge(kb.status)}
                        {getTypeBadge(kb.type)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-umind-gray/60 text-xs space-y-1">
                        <div>{formatFileSize(kb.file_size)}</div>
                        <div>{new Date(kb.created_at).toLocaleDateString("pt-BR")}</div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-600 text-umind-gray h-8 px-2"
                          onClick={() => {
                            setSelectedKnowledge(kb);
                            setIsAccessControlOpen(true);
                          }}
                        >
                          <Users className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-600 text-red-400 h-8 px-2"
                          onClick={() => handleDelete(kb.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Desktop Table */
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700">
                  <TableHead className="text-umind-gray">Título</TableHead>
                  <TableHead className="text-umind-gray">Tipo</TableHead>
                  <TableHead className="text-umind-gray">Status</TableHead>
                  <TableHead className="text-umind-gray">Tamanho</TableHead>
                  <TableHead className="text-umind-gray">Criado por</TableHead>
                  <TableHead className="text-umind-gray">Data</TableHead>
                  <TableHead className="text-umind-gray">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKnowledgeBases.map((kb) => (
                  <TableRow key={kb.id} className="border-zinc-700">
                    <TableCell className="text-umind-gray">
                      <div>
                        <div className="font-medium">{kb.title}</div>
                        <div className="text-sm text-umind-gray/70">{kb.description}</div>
                        {kb.tags && kb.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {kb.tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {kb.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{kb.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(kb.type)}</TableCell>
                    <TableCell>
                      <Select
                        value={kb.status}
                        onValueChange={(value) => handleStatusChange(kb.id, value as KnowledgeBase['status'])}
                      >
                        <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                          <SelectItem value="ACTIVE">Ativo</SelectItem>
                          <SelectItem value="INACTIVE">Inativo</SelectItem>
                          <SelectItem value="DRAFT">Rascunho</SelectItem>
                          <SelectItem value="ARCHIVED">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-umind-gray">{formatFileSize(kb.file_size)}</TableCell>
                    <TableCell className="text-umind-gray">{kb.creator_name}</TableCell>
                    <TableCell className="text-umind-gray">
                      {new Date(kb.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-600 text-umind-gray"
                        onClick={() => {
                          setSelectedKnowledge(kb);
                          setIsAccessControlOpen(true);
                        }}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Acesso
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-600 text-red-400"
                        onClick={() => handleDelete(kb.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredKnowledgeBases.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-umind-gray/50 mx-auto mb-4" />
              <h3 className="text-umind-gray text-lg font-medium mb-2">
                {knowledgeBases.length === 0 ? 'Nenhuma base de conhecimento' : 'Nenhum resultado encontrado'}
              </h3>
              <p className="text-umind-gray/70">
                {knowledgeBases.length === 0 
                  ? 'Comece criando sua primeira base de conhecimento'
                  : 'Tente ajustar os filtros de busca'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Access Control Dialog */}
      <Dialog open={isAccessControlOpen} onOpenChange={setIsAccessControlOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-umind-gray">
              Controle de Acesso - {selectedKnowledge?.title}
            </DialogTitle>
            <DialogDescription className="text-umind-gray/70">
              Configure quais usuários têm acesso a esta base de conhecimento
            </DialogDescription>
          </DialogHeader>
          {selectedKnowledge && (
            <UserAccessControl 
              knowledgeBase={selectedKnowledge}
              onClose={() => setIsAccessControlOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
