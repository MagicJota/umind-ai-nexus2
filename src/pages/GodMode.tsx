
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

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
  const [users] = useState<User[]>([
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

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Check admin credentials
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
    toast({
      title: "Status atualizado",
      description: `Usuário ${newStatus === "active" ? "ativado" : "desativado"} com sucesso`,
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
      <Badge className={`${variants[status]} text-white`}>
        {labels[status]}
      </Badge>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-umind-black flex items-center justify-center p-6">
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
                  className="bg-zinc-800 border-zinc-700 text-umind-gray"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-umind-gray">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="bg-zinc-800 border-zinc-700 text-umind-gray"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
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
    <div className="min-h-screen bg-umind-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-500 mb-2">🔐 GOD MODE</h1>
          <p className="text-umind-gray/70">Painel de administração do sistema</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-900">
            <TabsTrigger value="users" className="data-[state=active]:bg-red-600">
              Gerenciar Usuários
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-red-600">
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-umind-gray">Lista de Usuários</CardTitle>
                <CardDescription className="text-umind-gray/70">
                  Gerencie o acesso e status dos usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-umind-gray">Limite de usuários ativos</Label>
                    <Input
                      type="number"
                      defaultValue="100"
                      className="bg-zinc-800 border-zinc-700 text-umind-gray"
                    />
                  </div>
                  <div>
                    <Label className="text-umind-gray">Tempo de sessão (horas)</Label>
                    <Input
                      type="number"
                      defaultValue="24"
                      className="bg-zinc-800 border-zinc-700 text-umind-gray"
                    />
                  </div>
                </div>
                <Button className="bg-red-600 hover:bg-red-700">
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GodMode;
