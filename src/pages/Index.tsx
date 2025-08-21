import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserData } from "@/context/UserDataContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { userData } = useUserData();

  useEffect(() => {
    // Redirect to dashboard if onboarding is completed
    if (userData.isOnboardingCompleted) {
      navigate('/dashboard');
    }
  }, [userData.isOnboardingCompleted, navigate]);

  const handleGetStarted = () => {
    if (userData.isOnboardingCompleted) {
      navigate('/dashboard');
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Money Matter – AI Finance Assistant</title>
        <meta name="description" content="Plan budgets, goals, EMIs and savings with AI guidance." />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/" />
      </Helmet>
      
      <div className="relative z-10">
        <header className="container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <div className="text-xl font-bold tracking-tight text-gray-900">Money Matter</div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => navigate("/dashboard")}>
              Open Dashboard
            </Button>
          </nav>
        </header>
        
        <main>
          <section className="container mx-auto px-4 py-20">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 text-gray-900">
                Smart, adaptive budgeting for your life
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
                An AI finance copilot that plans your budget, goals, and EMIs—personalized to income, city, and priorities.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 shadow-lg w-full sm:w-auto px-8 py-3" 
                  onClick={handleGetStarted}
                >
                  {userData.isOnboardingCompleted ? 'Open Dashboard' : 'Start Your Financial Journey'}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto px-8 py-3" 
                  onClick={() => navigate("/analytics")}
                >
                  View Analytics
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Index;