import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Menu, Sparkles } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/Home";
import { Sidebar } from "@/components/Sidebar";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full shadow-xl">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="md:hidden flex items-center gap-2 border-b bg-background px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Vanntai Test</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/conversation/:id" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
