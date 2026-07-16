import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Admin from "@/pages/Admin";
import BookingPage from "@/pages/BookingPage";
import MenuPage from "@/pages/MenuPage";
import CheckinPage from "@/pages/CheckinPage";
import CatalogPage from "@/pages/CatalogPage";
import LandingPagePublic from "@/pages/LandingPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ThemeContext, createThemeState, applyTheme } from "@/hooks/use-theme";
import PWAInstallButton from "@/components/PWAInstallButton";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <>{children}</>;
}

function BookingRoute({ params }: { params: { userId: string } }) {
  return <BookingPage userId={params.userId} />;
}

function MenuRoute({ params }: { params: { userId: string } }) {
  return <MenuPage userId={params.userId} />;
}

function CheckinRoute({ params }: { params: { userId: string } }) {
  return <CheckinPage userId={params.userId} />;
}

function CatalogRoute({ params }: { params: { userId: string } }) {
  return <CatalogPage userId={params.userId} />;
}

function LandingPublicRoute({ params }: { params: { userId: string } }) {
  return <LandingPagePublic userId={params.userId} />;
}

function AdminUserRoute({ params }: { params: { userId: string } }) {
  return (
    <AuthGuard>
      <Admin viewingUserId={params.userId} />
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/book/:userId" component={BookingRoute} />
      <Route path="/menu/:userId" component={MenuRoute} />
      <Route path="/checkin/:userId" component={CheckinRoute} />
      <Route path="/catalog/:userId" component={CatalogRoute} />
      <Route path="/landing/:userId" component={LandingPublicRoute} />
      <Route path="/admin/user/:userId" component={AdminUserRoute} />
      <Route path="/admin">
        <AuthGuard>
          <Admin />
        </AuthGuard>
      </Route>
      <Route path="/">
        <AuthGuard>
          <Redirect to="/admin" />
        </AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [theme, setTheme] = useState<"light" | "dark">(createThemeState);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === "light" ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
          <PWAInstallButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeContext.Provider>
  );
}

export default App;
