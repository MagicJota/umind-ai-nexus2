
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o chat...",
      });
      navigate("/chat");
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate registration submission (no account creation)
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Solicitação de registro enviada",
        description: "Sua conta será ativada por um administrador em breve.",
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-umind-black flex flex-col">
      {/* Header with UMIND Logo */}
      <div className="absolute top-6 left-6 z-10">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/1988c68c-7e04-415b-8f30-609f18924a6c.png" 
            alt="UMIND" 
            className="w-12 h-12"
          />
          <div>
            <h1 className="text-xl font-medium text-umind-gray">UMIND</h1>
            <p className="text-sm text-umind-gray/70">SALES</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-zinc-900">
              <TabsTrigger value="login" className="data-[state=active]:bg-umind-gradient">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-umind-gradient">
                Registrar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-umind-gray">Bem-vindo de volta</CardTitle>
                  <CardDescription className="text-umind-gray/70">
                    Entre com suas credenciais para acessar o assistente AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-umind-gray">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
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
                      className="w-full bg-umind-gradient hover:opacity-90 transition-opacity"
                      disabled={isLoading}
                    >
                      {isLoading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-umind-gray">Criar conta</CardTitle>
                  <CardDescription className="text-umind-gray/70">
                    Solicite acesso ao assistente AI da UMIND
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-umind-gray">Nome completo</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="Seu nome completo"
                        required
                        className="bg-zinc-800 border-zinc-700 text-umind-gray"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registerEmail" className="text-umind-gray">Email</Label>
                      <Input
                        id="registerEmail"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        required
                        className="bg-zinc-800 border-zinc-700 text-umind-gray"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registerPassword" className="text-umind-gray">Senha</Label>
                      <Input
                        id="registerPassword"
                        name="password"
                        type="password"
                        required
                        className="bg-zinc-800 border-zinc-700 text-umind-gray"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-umind-gray">Empresa</Label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        placeholder="Nome da sua empresa"
                        required
                        className="bg-zinc-800 border-zinc-700 text-umind-gray"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-umind-gradient hover:opacity-90 transition-opacity"
                      disabled={isLoading}
                    >
                      {isLoading ? "Enviando..." : "Solicitar acesso"}
                    </Button>
                  </form>
                  <p className="text-xs text-umind-gray/60 mt-4 text-center">
                    Sua conta será ativada por um administrador após a revisão
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Login;
