import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Money Matter – AI Finance Assistant</title>
        <meta name="description" content="Plan budgets, goals, EMIs and savings with AI guidance." />
        <link rel="canonical" href="https://1778dcd4-4c4f-40f6-bb5c-ec1b224c1580.lovableproject.com/" />
      </Helmet>
      <header className="container py-10">
        <nav className="flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight">Money Matter</div>
          <Button variant="secondary" onClick={() => navigate("/onboarding")}>Get Started</Button>
        </nav>
      </header>
      <main>
        <section className="container py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">Smart, adaptive budgeting for your life</h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10">An AI finance copilot that plans your budget, goals, and EMIs—personalized to income, city, and priorities.</p>
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="shadow-elegant transition-smooth hover:shadow-glow" onClick={() => navigate("/onboarding")}>
                Start your plan
              </Button>
              <Button size="lg" variant="outline" className="transition-smooth" onClick={() => navigate("/dashboard")}>
                View sample dashboard
              </Button>
              <Button size="lg" variant="secondary" className="transition-smooth" onClick={() => navigate("/tracker")}>
                Open daily tracker
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;