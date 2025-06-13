
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate("/chat");
      } else {
        navigate("/login");
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-umind-black flex items-center justify-center">
        <div className="text-umind-gray">Carregando...</div>
      </div>
    );
  }

  return null;
};

export default Index;
