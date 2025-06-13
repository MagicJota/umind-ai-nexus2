
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  console.log('Index page: user:', !!user, 'loading:', loading);

  useEffect(() => {
    console.log('Index useEffect: loading:', loading, 'user:', !!user);
    
    if (!loading) {
      if (user) {
        console.log('Index: User found, navigating to /chat');
        navigate("/chat");
      } else {
        console.log('Index: No user, navigating to /login');
        navigate("/login");
      }
    }
  }, [user, loading, navigate]);

  console.log('Index: Rendering loading state, loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen bg-umind-black flex items-center justify-center">
        <div className="text-umind-gray">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-umind-black flex items-center justify-center">
      <div className="text-umind-gray">Redirecionando...</div>
    </div>
  );
};

export default Index;
