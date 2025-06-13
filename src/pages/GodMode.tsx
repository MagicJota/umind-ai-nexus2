
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Plus, Menu, Users, Settings, Eye, EyeOff } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "active" | "inactive" | "pending";
  createdAt: Date;
}

const GodMode = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "João Silva",
      email: "joao@empresa.com",
      company: "Empresa ABC",
      status: "active",
      createdAt: new Date("2023-10-01"),
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@vendas.com",
      company: "Vendas Corp",
      status: "pending",
      createdAt: new Date("2023-11-15"),
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro@startup.com",
      company: "Startup XYZ",
      status: "inactive",
      createdAt: new Date("2023-09-20"),
    },
  ]);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const isMobile = useIsMobile();

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (
      (email === "itsjotaerre@gmail.com" || email === "@Valdemiro2025") &&
      password
    ) {
      setIsAuthenticated(true);
      toast({
        title: "Acesso autorizado",
        description: "Bem-vindo ao painel administrativo",
      });
    } else {
      toast({
        title: "Acesso negado",
        description: "Credenciais inválidas",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (userId: string, newStatus: "active" | "inactive") => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
    toast({
      title: "Status atualizado",
      description: `Usuário ${newStatus === "active" ? "ativado" : "desativado"} com sucesso`,
    });
  };

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUser: User = {
      id: (Date.now()).toString(),
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      company: formData.get("company") as string,
      status: "active",
      createdAt: new Date(),
    };
    
    setUsers(prev => [...prev, newUser]);
    setIsCreateUserOpen(false);
    toast({
      title: "Usuário criado",
      description: "Novo usuário criado com sucesso",
    });
  };

  const getStatusBadge = (status: User["status"]) => {
    const variants = {
      active: "bg-green-500",
      inactive: "bg-red-500",
      pending: "bg-yellow-500",
    };
    
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
      pending: "Pendente",
    };

    return (
      <Badge className={`${variants[status]} text-white text-xs`}>
        {labels[status]}
      </Badge>
    );
  };

  const UserCard = ({ user }: { user: User }) => (
    <Card className="bg-zinc-900 border-zinc-800 mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-umind-gray font-medium truncate">{user.name}</h3>
            <p className="text-umind-gray/70 text-sm truncate">{user.email}</p>
            <p className="text-umind-gray/60 text-xs">{user.company}</p>
          </div>
          <div className="ml-2">
            {getStatusBadge(user.status)}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-umind-gray/60 text-xs">
            {user.createdAt.toLocaleDateString("pt-BR")}
          </span>
          <div className="flex space-x-2">
            {user.status !== "active" && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-xs h-8 px-3"
                onClick={() => handleStatusChange(user.id, "active")}
              >
                Ativar
              </Button>
            )}
            {user.status === "active" && (
              <Button
                size="sm"
                variant="destructive"
                className="text-xs h-8 px-3"
                onClick={() => handleStatusChange(user.id, "inactive")}
              >
                Desativar
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
              <Label htmlFor="company" className="text-umind-gray">Empresa</Label>
              <Input
                id="company"
                name="company"
                required
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-umind-black flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-500">⚠️ GOD MODE</CardTitle>
            <CardDescription className="text-umind-gray/70">
              Acesso restrito a administradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-umind-gray">Email do Administrador</Label>
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
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white h-12"
              >
                Acessar Painel
              </Button>
            </form>
          </CardContent>
        </Card>
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
            <p className="text-umind-gray/70 text-sm">Painel administrativo</p>
          </div>
          <Button
            onClick={() => setIsCreateUserOpen(true)}
            className="bg-green-600 hover:bg-green-700 h-10 px-3"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:max-w-6xl lg:mx-auto">
        {/* Desktop Header */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-3xl font-bold text-red-500 mb-2">🔐 GOD MODE</h1>
          <p className="text-umind-gray/70">Painel de administração do sistema</p>
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
                    <CardTitle className="text-umind-gray">Lista de Usuários</CardTitle>
                    <CardDescription className="text-umind-gray/70">
                      Gerencie o acesso e status dos usuários
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
                        <TableHead className="text-umind-gray">Status</TableHead>
                        <TableHead className="text-umind-gray">Criado em</TableHead>
                        <TableHead className="text-umind-gray">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-zinc-700">
                          <TableCell className="text-umind-gray">{user.name}</TableCell>
                          <TableCell className="text-umind-gray">{user.email}</TableCell>
                          <TableCell className="text-umind-gray">{user.company}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-umind-gray">
                            {user.createdAt.toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="space-x-2">
                            {user.status !== "active" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleStatusChange(user.id, "active")}
                              >
                                Ativar
                              </Button>
                            )}
                            {user.status === "active" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange(user.id, "inactive")}
                              >
                                Desativar
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
