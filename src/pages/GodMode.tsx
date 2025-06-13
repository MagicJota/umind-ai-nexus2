
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Plus, Users, Settings, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  company: string | null;
  role: 'ADMIN' | 'PREMIUM' | 'BASIC';
  created_at: string;
  updated_at: string;
}

const GodMode = () => {
  const { profile, signOut } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar usuários",
          variant: "destructive",
        });
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newRole: 'ADMIN' | 'PREMIUM' | 'BASIC') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao atualizar usuário",
          variant: "destructive",
        });
      } else {
        setUsers(prev => prev.map(user => 
          user.user_id === userId ? { ...user, role: newRole } : user
        ));
        toast({
          title: "Usuário atualizado",
          description: `Role alterado para ${newRole}`,
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("name") as string;
    const company = formData.get("company") as string;
    
    try {
      const { error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: fullName,
          company: company
        },
        email_confirm: true
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsCreateUserOpen(false);
        fetchUsers();
        toast({
          title: "Usuário criado",
          description: "Novo usuário criado com sucesso",
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar usuário",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
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

  const UserCard = ({ user }: { user: UserProfile }) => (
    <Card className="bg-zinc-900 border-zinc-800 mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-umind-gray font-medium truncate">{user.full_name}</h3>
            <p className="text-umind-gray/70 text-sm truncate">{user.email}</p>
            <p className="text-umind-gray/60 text-xs">{user.company || 'Sem empresa'}</p>
          </div>
          <div className="ml-2">
            {getRoleBadge(user.role)}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-umind-gray/60 text-xs">
            {new Date(user.created_at).toLocaleDateString("pt-BR")}
          </span>
          <div className="flex space-x-2">
            {user.role !== "ADMIN" && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-xs h-8 px-3"
                onClick={() => handleStatusChange(user.user_id, "ADMIN")}
              >
                Admin
              </Button>
            )}
            {user.role !== "PREMIUM" && (
              <Button
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-xs h-8 px-3"
                onClick={() => handleStatusChange(user.user_id, "PREMIUM")}
              >
                Premium
              </Button>
            )}
            {user.role !== "BASIC" && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-xs h-8 px-3"
                onClick={() => handleStatusChange(user.user_id, "BASIC")}
              >
                Básico
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CreateUserDialog = () => {
    const DialogComponent = isMobile ? Sheet : Dialog;
    const ContentComponent = isMobile ? SheetContent : DialogContent;
    const HeaderComponent = isMobile ? SheetHeader : DialogHeader;
    const TitleComponent = isMobile ? SheetTitle : DialogTitle;
    const DescriptionComponent = isMobile ? SheetDescription : DialogDescription;

    return (
      <DialogComponent open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <ContentComponent className="bg-zinc-900 border-zinc-800">
          <HeaderComponent>
            <TitleComponent className="text-umind-gray">Criar Novo Usuário</TitleComponent>
            <DescriptionComponent className="text-umind-gray/70">
              Adicione um novo usuário manualmente ao sistema
            </DescriptionComponent>
          </HeaderComponent>
          <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-umind-gray">Nome completo</Label>
              <Input
                id="name"
                name="name"
                required
                className="bg-zinc-800 border-zinc-700 text-umind-gray h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-umind-gray">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                className="bg-zinc-800 border-zinc-700 text-umind-gray h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-umind-gray">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-zinc-800 border-zinc-700 text-umind-gray h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-umind-gray">Empresa</Label>
              <Input
                id="company"
                name="company"
                className="bg-zinc-800 border-zinc-700 text-umind-gray h-12 text-base"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateUserOpen(false)}
                className="border-zinc-700 text-umind-gray h-12 sm:h-10"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 h-12 sm:h-10"
              >
                Criar Usuário
              </Button>
            </div>
          </form>
        </ContentComponent>
      </DialogComponent>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-umind-black flex items-center justify-center">
        <div className="text-umind-gray">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-umind-black">
      {/* Mobile Header */}
      <div className="lg:hidden bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-red-500">🔐 GOD MODE</h1>
            <p className="text-umind-gray/70 text-sm">Bem-vindo, {profile?.full_name}</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsCreateUserOpen(true)}
              className="bg-green-600 hover:bg-green-700 h-10 px-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-zinc-700 text-umind-gray h-10 px-3"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:max-w-6xl lg:mx-auto">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-red-500 mb-2">🔐 GOD MODE</h1>
              <p className="text-umind-gray/70">Bem-vindo, {profile?.full_name} - Painel de administração</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-zinc-700 text-umind-gray"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-900 h-12">
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-red-600 h-10 text-sm sm:text-base"
            >
              <Users className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Gerenciar </span>Usuários
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-red-600 h-10 text-sm sm:text-base"
            >
              <Settings className="w-4 h-4 mr-1 sm:mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                  <div>
                    <CardTitle className="text-umind-gray">Lista de Usuários ({users.length})</CardTitle>
                    <CardDescription className="text-umind-gray/70">
                      Gerencie roles e acesso dos usuários
                    </CardDescription>
                  </div>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 h-12 sm:h-10 hidden lg:flex"
                    onClick={() => setIsCreateUserOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                  {users.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-700">
                        <TableHead className="text-umind-gray">Nome</TableHead>
                        <TableHead className="text-umind-gray">Email</TableHead>
                        <TableHead className="text-umind-gray">Empresa</TableHead>
                        <TableHead className="text-umind-gray">Role</TableHead>
                        <TableHead className="text-umind-gray">Criado em</TableHead>
                        <TableHead className="text-umind-gray">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-zinc-700">
                          <TableCell className="text-umind-gray">{user.full_name}</TableCell>
                          <TableCell className="text-umind-gray">{user.email}</TableCell>
                          <TableCell className="text-umind-gray">{user.company || 'Sem empresa'}</TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="text-umind-gray">
                            {new Date(user.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="space-x-2">
                            {user.role !== "ADMIN" && (
                              <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleStatusChange(user.user_id, "ADMIN")}
                              >
                                Admin
                              </Button>
                            )}
                            {user.role !== "PREMIUM" && (
                              <Button
                                size="sm"
                                className="bg-yellow-600 hover:bg-yellow-700"
                                onClick={() => handleStatusChange(user.user_id, "PREMIUM")}
                              >
                                Premium
                              </Button>
                            )}
                            {user.role !== "BASIC" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleStatusChange(user.user_id, "BASIC")}
                              >
                                Básico
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-umind-gray">Configurações do Sistema</CardTitle>
                <CardDescription className="text-umind-gray/70">
                  Configure parâmetros gerais do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-umind-gray">Limite de usuários ativos</Label>
                    <Input
                      type="number"
                      defaultValue="100"
                      className="bg-zinc-800 border-zinc-700 text-umind-gray h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-umind-gray">Tempo de sessão (horas)</Label>
                    <Input
                      type="number"
                      defaultValue="24"
                      className="bg-zinc-800 border-zinc-700 text-umind-gray h-12 text-base"
                    />
                  </div>
                </div>
                <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto h-12">
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CreateUserDialog />
      </div>
    </div>
  );
};

export default GodMode;
