
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Search, Users, UserPlus, UserMinus, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface KnowledgeBase {
  id: string;
  title: string;
  is_public: boolean;
  created_by: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'PREMIUM' | 'BASIC';
  hasAccess?: boolean;
}

interface UserAccessControlProps {
  knowledgeBase: KnowledgeBase;
  onClose: () => void;
}

export function UserAccessControl({ knowledgeBase, onClose }: UserAccessControlProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsersAndAccess();
  }, [knowledgeBase.id]);

  const fetchUsersAndAccess = async () => {
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast({
          title: "Erro",
          description: "Erro ao carregar usuários",
          variant: "destructive",
        });
        return;
      }

      // Fetch access grants for this knowledge base
      const { data: accessData, error: accessError } = await supabase
        .from('user_knowledge_access')
        .select('user_id')
        .eq('knowledge_base_id', knowledgeBase.id);

      if (accessError) {
        console.error('Error fetching access:', accessError);
        toast({
          title: "Erro",
          description: "Erro ao carregar acessos",
          variant: "destructive",
        });
        return;
      }

      const accessUserIds = new Set(accessData?.map(a => a.user_id) || []);

      const usersWithAccess = usersData?.map(user => ({
        ...user,
        hasAccess: accessUserIds.has(user.user_id) || 
                  knowledgeBase.is_public || 
                  user.user_id === knowledgeBase.created_by
      })) || [];

      setUsers(usersWithAccess);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserAccess = async (userId: string, currentAccess: boolean) => {
    setUpdating(userId);
    
    try {
      if (currentAccess) {
        // Remove access
        const { error } = await supabase
          .from('user_knowledge_access')
          .delete()
          .eq('knowledge_base_id', knowledgeBase.id)
          .eq('user_id', userId);

        if (error) {
          toast({
            title: "Erro",
            description: "Erro ao remover acesso",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Acesso removido",
          description: "Usuário não tem mais acesso a esta base",
        });
      } else {
        // Grant access
        const { error } = await supabase
          .from('user_knowledge_access')
          .insert({
            knowledge_base_id: knowledgeBase.id,
            user_id: userId,
            granted_by: knowledgeBase.created_by
          });

        if (error) {
          toast({
            title: "Erro",
            description: "Erro ao conceder acesso",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Acesso concedido",
          description: "Usuário agora tem acesso a esta base",
        });
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.user_id === userId 
          ? { ...user, hasAccess: !currentAccess }
          : user
      ));

    } catch (error) {
      console.error('Error toggling access:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const togglePublicAccess = async (isPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ is_public: isPublic })
        .eq('id', knowledgeBase.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar acesso público",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isPublic ? "Acesso público ativado" : "Acesso público desativado",
        description: isPublic 
          ? "Todos os usuários agora têm acesso a esta base"
          : "Acesso restrito aos usuários autorizados",
      });

      // Refresh data
      fetchUsersAndAccess();
    } catch (error) {
      console.error('Error toggling public access:', error);
    }
  };

  const getRoleBadge = (role: UserProfile["role"]) => {
    const variants = {
      ADMIN: "bg-red-500",
      PREMIUM: "bg-yellow-500",
      BASIC: "bg-green-500",
    };
    
    const labels = {
      ADMIN: "Admin",
      PREMIUM: "Premium",
      BASIC: "Básico",
    };

    return (
      <Badge className={`${variants[role]} text-white text-xs`}>
        {labels[role]}
      </Badge>
    );
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const usersWithAccess = filteredUsers.filter(user => user.hasAccess);
  const usersWithoutAccess = filteredUsers.filter(user => !user.hasAccess);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-umind-gray">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto">
      {/* Public Access Toggle */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-blue-400" />
              <div>
                <Label className="text-umind-gray font-medium">Acesso Público</Label>
                <p className="text-umind-gray/70 text-sm">
                  Quando ativo, todos os usuários têm acesso automaticamente
                </p>
              </div>
            </div>
            <Switch
              checked={knowledgeBase.is_public}
              onCheckedChange={togglePublicAccess}
            />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-umind-gray/50 w-4 h-4" />
        <Input
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-zinc-800 border-zinc-700 text-umind-gray"
        />
      </div>

      {/* Users with Access */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-umind-gray text-lg flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-green-400" />
            Usuários com Acesso ({usersWithAccess.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {usersWithAccess.length === 0 ? (
            <p className="text-umind-gray/70 text-center py-4">
              {knowledgeBase.is_public 
                ? "Todos os usuários têm acesso (público)"
                : "Nenhum usuário com acesso específico"
              }
            </p>
          ) : (
            usersWithAccess.map((user) => {
              const isCreator = user.user_id === knowledgeBase.created_by;
              const hasPublicAccess = knowledgeBase.is_public;
              const canRemove = !isCreator && !hasPublicAccess;

              return (
                <div key={user.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-zinc-700 text-umind-gray text-xs">
                        {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-umind-gray font-medium flex items-center space-x-2">
                        <span>{user.full_name}</span>
                        {isCreator && (
                          <Badge variant="outline" className="text-xs">
                            Criador
                          </Badge>
                        )}
                      </div>
                      <div className="text-umind-gray/70 text-sm">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRoleBadge(user.role)}
                    {canRemove && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        onClick={() => toggleUserAccess(user.user_id, true)}
                        disabled={updating === user.user_id}
                      >
                        {updating === user.user_id ? (
                          "Removendo..."
                        ) : (
                          <>
                            <UserMinus className="w-3 h-3 mr-1" />
                            Remover
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Users without Access */}
      {!knowledgeBase.is_public && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-umind-gray text-lg flex items-center">
              <UserMinus className="w-5 h-5 mr-2 text-red-400" />
              Usuários sem Acesso ({usersWithoutAccess.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usersWithoutAccess.length === 0 ? (
              <p className="text-umind-gray/70 text-center py-4">
                Todos os usuários têm acesso
              </p>
            ) : (
              usersWithoutAccess.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-zinc-700 text-umind-gray text-xs">
                        {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-umind-gray font-medium">{user.full_name}</div>
                      <div className="text-umind-gray/70 text-sm">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRoleBadge(user.role)}
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => toggleUserAccess(user.user_id, false)}
                      disabled={updating === user.user_id}
                    >
                      {updating === user.user_id ? (
                        "Concedendo..."
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" />
                          Conceder
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onClose}
          variant="outline"
          className="border-zinc-600 text-umind-gray"
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}
