import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Calendar, MessageCircle, Users, LogIn, UserPlus, Loader2, Eye, EyeOff, Sun, Moon } from "lucide-react";
import logoImg from "@assets/logo_migestion_png_1773789215959.png";
import { Footer } from "@/components/Footer";
import { useLogin, useRegister, useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";

export default function Landing() {
  const [mode, setMode] = useState<"landing" | "login" | "register" | "forgot">("landing");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotPending, setForgotPending] = useState(false);
  const login = useLogin();
  const register = useRegister();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  if (isAuthenticated) {
    setLocation("/admin");
    return null;
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    login.mutate(
      { username, password },
      {
        onSuccess: () => {
          setLocation("/admin");
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    register.mutate(
      { username, password, firstName, lastName, email },
      {
        onSuccess: () => {
          setLocation("/admin");
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  function resetForm() {
    setUsername("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setShowPassword(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotPending(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotSent(true);
    } catch {
      toast({ title: "Error", description: "No se pudo enviar el correo.", variant: "destructive" });
    } finally {
      setForgotPending(false);
    }
  }

  if (mode === "forgot") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col">
        <header className="bg-white dark:bg-card border-b border-border shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button onClick={() => { setMode("landing"); setForgotSent(false); setForgotEmail(""); }} className="flex items-center gap-2">
              <img src={logoImg} alt="migestion.pro" className="h-10 w-10 rounded-full object-cover" />
              <h1 className="text-xl font-bold font-display text-gray-900 dark:text-foreground">migestion.pro</h1>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md bg-white dark:bg-card shadow-lg">
            <CardContent className="p-8">
              {forgotSent ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto bg-green-100 p-4 rounded-full w-fit">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-foreground">Revisa tu correo</h2>
                  <p className="text-muted-foreground text-sm">
                    Si el correo <strong>{forgotEmail}</strong> tiene una cuenta, recibirás un enlace para restablecer tu contraseña. El enlace es válido por 1 hora.
                  </p>
                  <Button className="w-full h-11" onClick={() => { setMode("login"); setForgotSent(false); setForgotEmail(""); }}>
                    Volver al inicio de sesión
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-foreground">¿Olvidaste tu contraseña?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Ingresa tu correo y te enviaremos un enlace de recuperación.</p>
                  </div>
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Correo electrónico</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        required
                        data-testid="input-forgot-email"
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={forgotPending} data-testid="button-forgot-submit">
                      {forgotPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Enviar enlace de recuperación
                    </Button>
                  </form>
                  <p className="text-center text-sm text-muted-foreground mt-6">
                    <button onClick={() => { setMode("login"); }} className="text-primary font-semibold hover:underline">
                      Volver al inicio de sesión
                    </button>
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (mode === "login") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-border shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button onClick={() => { setMode("landing"); resetForm(); }} className="flex items-center gap-2">
              <img src={logoImg} alt="migestion.pro" className="h-10 w-10 rounded-full object-cover" />
              <h1 className="text-xl font-bold font-display text-gray-900">migestion.pro</h1>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md bg-white shadow-lg">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto bg-primary/10 p-3 rounded-xl w-fit mb-4">
                  <LogIn className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900">Iniciar Sesión</h2>
                <p className="text-sm text-muted-foreground mt-1">Ingresa con tu cuenta</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Usuario</Label>
                  <Input
                    id="login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tu nombre de usuario"
                    required
                    data-testid="input-login-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      required
                      data-testid="input-login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={login.isPending}
                  data-testid="button-login-submit"
                >
                  {login.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                  Iniciar Sesión
                </Button>
              </form>

              <div className="mt-6 space-y-3 text-center text-sm text-muted-foreground">
                <div>
                  <button onClick={() => setMode("forgot")} className="text-primary hover:underline" data-testid="link-forgot-password">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div>
                  ¿No tienes cuenta?{" "}
                  <button onClick={() => { setMode("register"); resetForm(); }} className="text-primary font-semibold hover:underline" data-testid="link-go-register">
                    Registrarse
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-border shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button onClick={() => { setMode("landing"); resetForm(); }} className="flex items-center gap-2">
              <img src={logoImg} alt="migestion.pro" className="h-10 w-10 rounded-full object-cover" />
              <h1 className="text-xl font-bold font-display text-gray-900">migestion.pro</h1>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md bg-white shadow-lg">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto bg-primary/10 p-3 rounded-xl w-fit mb-4">
                  <UserPlus className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900">Crear Cuenta</h2>
                <p className="text-sm text-muted-foreground mt-1">Registra tu negocio en migestion.pro</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-firstName">Nombre *</Label>
                    <Input
                      id="reg-firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Nombre"
                      required
                      data-testid="input-register-firstName"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-lastName">Apellido</Label>
                    <Input
                      id="reg-lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Apellido"
                      data-testid="input-register-lastName"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Correo electrónico</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    data-testid="input-register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Usuario *</Label>
                  <Input
                    id="reg-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="min. 3 caracteres"
                    required
                    data-testid="input-register-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Contraseña *</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="min. 6 caracteres"
                      required
                      data-testid="input-register-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={register.isPending}
                  data-testid="button-register-submit"
                >
                  {register.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Crear Cuenta
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                ¿Ya tienes cuenta?{" "}
                <button onClick={() => { setMode("login"); resetForm(); }} className="text-primary font-semibold hover:underline" data-testid="link-go-login">
                  Iniciar Sesión
                </button>
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="migestion.pro" className="h-10 w-10 rounded-full object-cover" />
            <h1 className="text-xl font-bold font-display text-gray-900">migestion.pro</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-gray-400 hover:text-primary"
              data-testid="button-toggle-theme"
              title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" className="font-semibold" onClick={() => setMode("login")} data-testid="button-login">
              Iniciar Sesión
            </Button>
            <Button className="font-semibold" onClick={() => setMode("register")} data-testid="button-register">
              Registrarse
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="mx-auto w-fit">
              <img src={logoImg} alt="migestion.pro" className="h-24 w-24 rounded-full object-cover shadow-lg" />
            </div>
            <h2 className="text-4xl font-display font-bold text-gray-900">
              Reserva de Citas Simple y Rápida
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Administra tu disponibilidad, acepta reservas y comparte tu página de reservas personalizada con tus clientes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/25" onClick={() => setMode("register")} data-testid="button-signin-hero">
              <UserPlus className="w-5 h-5 mr-2" />
              Comenzar Gratis
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
            <Card className="bg-white border-border/50 shadow-sm text-left">
              <CardContent className="p-6 space-y-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">Gestionar Citas</h3>
                <p className="text-sm text-muted-foreground">Confirma, reprograma o cancela reservas desde tu panel de control.</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-border/50 shadow-sm text-left">
              <CardContent className="p-6 space-y-2">
                <div className="p-2 bg-green-50 text-green-600 rounded-lg w-fit">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">Integración con WhatsApp</h3>
                <p className="text-sm text-muted-foreground">Los clientes pueden contactarte por WhatsApp justo después de reservar.</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-border/50 shadow-sm text-left">
              <CardContent className="p-6 space-y-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg w-fit">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">Página de Reservas Personal</h3>
                <p className="text-sm text-muted-foreground">Comparte tu enlace único de reservas con cualquier persona.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
