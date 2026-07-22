import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock, Calendar, MessageCircle, Users, LogIn, UserPlus, Loader2, Eye, EyeOff,
  Sun, Moon, UtensilsCrossed, Grid3X3, Smartphone, MapPin, FileText, CheckSquare,
  BarChart3, ChevronRight, Zap, Shield, Star, ArrowRight, FolderKanban
} from "lucide-react";
import logoImg from "@assets/logo_migestion_png_1773789215959.png";
import { Footer } from "@/components/Footer";
import { useLogin, useRegister, useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";

const FEATURES = [
  {
    icon: UtensilsCrossed,
    color: "from-orange-500 to-amber-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-600 dark:text-orange-400",
    title: "Menú Online",
    desc: "Digitaliza tu menú de restaurant, cafetería o food truck. Actualízalo en tiempo real, sin apps ni impresiones.",
  },
  {
    icon: Grid3X3,
    color: "from-violet-500 to-purple-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-600 dark:text-violet-400",
    title: "Catálogo de Servicios",
    desc: "Presenta tus servicios, promociones y productos con fotos, precios y descripciones atractivas.",
  },
  {
    icon: Calendar,
    color: "from-blue-500 to-cyan-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    title: "Agenda de Citas",
    desc: "Página pública de reservas personalizada. Tus clientes eligen horario y reciben confirmación al instante.",
  },
  {
    icon: Smartphone,
    color: "from-teal-500 to-emerald-400",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-600 dark:text-teal-400",
    title: "Landing Page + App",
    desc: "Crea el sitio web de tu negocio e instálalo como aplicación en cualquier celular sin ir a la tienda de apps.",
  },
  {
    icon: Clock,
    color: "from-rose-500 to-pink-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-600 dark:text-rose-400",
    title: "Reloj Checador",
    desc: "Control de asistencia con verificación GPS por sucursal. Reportes automáticos enviados directo a tu correo.",
  },
  {
    icon: MapPin,
    color: "from-red-500 to-orange-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-600 dark:text-red-400",
    title: "Control por Sucursal",
    desc: "Define geofences por sucursal. Solo se puede checar desde la ubicación autorizada, sin trampas.",
  },
  {
    icon: FileText,
    color: "from-indigo-500 to-blue-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    text: "text-indigo-600 dark:text-indigo-400",
    title: "Minutas de Reunión",
    desc: "Documenta acuerdos y tareas de cada reunión. Mantén a tu equipo alineado con historial completo.",
  },
  {
    icon: CheckSquare,
    color: "from-green-500 to-emerald-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-600 dark:text-green-400",
    title: "Checklist de Tareas",
    desc: "Gestiona listas de tareas pendientes para tu equipo. Marca progreso y mantén control de pendientes.",
  },
  {
    icon: FolderKanban,
    color: "from-purple-500 to-indigo-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-600 dark:text-purple-400",
    title: "Proyectos Scrum",
    desc: "Organiza proyectos con tableros Kanban, backlog y sprints. Asigna responsables y da seguimiento a tu equipo.",
  },
  {
    icon: BarChart3,
    color: "from-sky-500 to-blue-400",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-600 dark:text-sky-400",
    title: "Reportes de Citas",
    desc: "Visualiza citas confirmadas, canceladas y asistencia. Estadísticas claras para tomar mejores decisiones.",
  },
];

const STATS = [
  { value: "10+", label: "Módulos integrados" },
  { value: "100%", label: "En la nube" },
  { value: "PWA", label: "Instala como app" },
  { value: "MXN", label: "Precios en pesos" },
];

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
        onSuccess: () => setLocation("/admin"),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    register.mutate(
      { username, password, firstName, lastName, email },
      {
        onSuccess: () => setLocation("/admin"),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function resetForm() {
    setUsername(""); setPassword(""); setFirstName(""); setLastName(""); setEmail(""); setShowPassword(false);
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
        <LandingHeader theme={theme} toggleTheme={toggleTheme} onLogin={() => setMode("login")} onRegister={() => setMode("register")} onHome={() => { setMode("landing"); resetForm(); }} />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="p-8">
              {forgotSent ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto bg-green-100 p-4 rounded-full w-fit">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold">Revisa tu correo</h2>
                  <p className="text-muted-foreground text-sm">Si el correo <strong>{forgotEmail}</strong> tiene cuenta, recibirás un enlace válido por 1 hora.</p>
                  <Button className="w-full h-11" onClick={() => { setMode("login"); setForgotSent(false); setForgotEmail(""); }}>
                    Volver al inicio de sesión
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">¿Olvidaste tu contraseña?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Te enviaremos un enlace de recuperación.</p>
                  </div>
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Correo electrónico</Label>
                      <Input id="forgot-email" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="tu@correo.com" required data-testid="input-forgot-email" />
                    </div>
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={forgotPending} data-testid="button-forgot-submit">
                      {forgotPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Enviar enlace de recuperación
                    </Button>
                  </form>
                  <p className="text-center text-sm text-muted-foreground mt-6">
                    <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Volver al inicio de sesión</button>
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
      <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col">
        <LandingHeader theme={theme} toggleTheme={toggleTheme} onLogin={() => setMode("login")} onRegister={() => setMode("register")} onHome={() => { setMode("landing"); resetForm(); }} />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto bg-primary/10 p-3 rounded-xl w-fit mb-4">
                  <LogIn className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
                <p className="text-sm text-muted-foreground mt-1">Ingresa con tu cuenta</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Usuario o correo</Label>
                  <Input id="login-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Tu usuario o correo" required data-testid="input-login-username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <div className="relative">
                    <Input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" required data-testid="input-login-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold" disabled={login.isPending} data-testid="button-login-submit">
                  {login.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                  Iniciar Sesión
                </Button>
              </form>
              <div className="mt-6 space-y-3 text-center text-sm text-muted-foreground">
                <div>
                  <button onClick={() => setMode("forgot")} className="text-primary hover:underline" data-testid="link-forgot-password">¿Olvidaste tu contraseña?</button>
                </div>
                <div>
                  ¿No tienes cuenta?{" "}
                  <button onClick={() => { setMode("register"); resetForm(); }} className="text-primary font-semibold hover:underline" data-testid="link-go-register">Registrarse</button>
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
      <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col">
        <LandingHeader theme={theme} toggleTheme={toggleTheme} onLogin={() => setMode("login")} onRegister={() => setMode("register")} onHome={() => { setMode("landing"); resetForm(); }} />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto bg-primary/10 p-3 rounded-xl w-fit mb-4">
                  <UserPlus className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Crear Cuenta</h2>
                <p className="text-sm text-muted-foreground mt-1">Registra tu negocio en migestion.pro</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-firstName">Nombre *</Label>
                    <Input id="reg-firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Nombre" required data-testid="input-register-firstName" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-lastName">Apellido</Label>
                    <Input id="reg-lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Apellido" data-testid="input-register-lastName" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Correo electrónico</Label>
                  <Input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" data-testid="input-register-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Usuario *</Label>
                  <Input id="reg-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="min. 3 caracteres" required data-testid="input-register-username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Contraseña *</Label>
                  <div className="relative">
                    <Input id="reg-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 6 caracteres" required data-testid="input-register-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold" disabled={register.isPending} data-testid="button-register-submit">
                  {register.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Crear Cuenta
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                ¿Ya tienes cuenta?{" "}
                <button onClick={() => { setMode("login"); resetForm(); }} className="text-primary font-semibold hover:underline" data-testid="link-go-login">Iniciar Sesión</button>
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-background overflow-x-hidden">
      <LandingHeader theme={theme} toggleTheme={toggleTheme} onLogin={() => setMode("login")} onRegister={() => setMode("register")} onHome={() => {}} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #8b5cf6 0%, transparent 40%), radial-gradient(circle at 60% 80%, #06b6d4 0%, transparent 40%)"}} />
        <div className="absolute inset-0" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-30 scale-150" />
              <img src={logoImg} alt="migestion.pro" className="relative h-24 w-24 rounded-full object-cover shadow-2xl ring-4 ring-white/20" />
            </div>

            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Plataforma todo-en-uno para tu negocio
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Digitaliza tu negocio con
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                migestion.pro
              </span>
            </h1>

            <p className="text-lg md:text-xl text-blue-100/80 max-w-2xl mb-10 leading-relaxed">
              Menú online, catálogo, citas, reloj checador, landing page instalable, minutas, proyectos Scrum y más — todo integrado en una sola plataforma para empresas mexicanas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="h-14 px-8 text-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-0 shadow-xl shadow-blue-500/30"
                onClick={() => setMode("register")}
                data-testid="button-hero-register"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Comenzar Gratis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg font-semibold border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
                onClick={() => setMode("login")}
                data-testid="button-hero-login"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Iniciar Sesión
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 w-full max-w-2xl">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl font-extrabold text-white">{s.value}</div>
                  <div className="text-xs text-blue-300 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-background to-transparent" />
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <Grid3X3 className="w-4 h-4" />
              Módulos disponibles
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-foreground">
              Todo lo que tu empresa necesita
            </h2>
            <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
              Cada módulo funciona de forma independiente o en conjunto. Tú decides qué activar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="group border border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className={`w-6 h-6 ${f.text}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-foreground text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="mx-auto w-14 h-14 bg-blue-100 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-foreground">Rápido de configurar</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">En minutos tienes tu página de citas, menú o catálogo publicado y listo para compartir con tus clientes.</p>
            </div>
            <div className="space-y-3">
              <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-950/50 rounded-2xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-foreground">Seguro y confiable</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Tus datos y los de tus clientes están protegidos. Backups automáticos y disponibilidad 24/7 garantizada.</p>
            </div>
            <div className="space-y-3">
              <div className="mx-auto w-14 h-14 bg-purple-100 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center">
                <Star className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-foreground">Hecho para México</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">Precios en MXN, soporte en español, diseñado pensando en la operación diaria de negocios mexicanos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: "radial-gradient(circle at 30% 50%, #3b82f6 0%, transparent 60%), radial-gradient(circle at 70% 50%, #8b5cf6 0%, transparent 60%)"}} />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">¿Listo para digitalizar tu negocio?</h2>
          <p className="text-blue-200/80 text-lg mb-8 max-w-xl mx-auto">
            Crea tu cuenta hoy y accede a todos los módulos. Sin compromisos, comienza gratis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="h-14 px-10 text-lg font-bold bg-white text-slate-900 hover:bg-blue-50"
              onClick={() => setMode("register")}
              data-testid="button-cta-register"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Crear cuenta gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent font-semibold"
              onClick={() => setMode("login")}
              data-testid="button-cta-login"
            >
              Ya tengo cuenta
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function LandingHeader({ theme, toggleTheme, onLogin, onRegister, onHome }: {
  theme: string; toggleTheme: () => void; onLogin: () => void; onRegister: () => void; onHome: () => void;
}) {
  return (
    <header className="bg-white/95 dark:bg-card/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button onClick={onHome} className="flex items-center gap-2.5 group">
          <img src={logoImg} alt="migestion.pro" className="h-9 w-9 rounded-full object-cover shadow group-hover:scale-105 transition-transform" />
          <span className="text-lg font-bold text-gray-900 dark:text-foreground tracking-tight">migestion.pro</span>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground" data-testid="button-toggle-theme" title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" className="font-semibold hidden sm:inline-flex" onClick={onLogin} data-testid="button-login">
            Iniciar Sesión
          </Button>
          <Button className="font-semibold" onClick={onRegister} data-testid="button-register">
            <UserPlus className="w-4 h-4 mr-1.5 hidden sm:block" />
            Registrarse
          </Button>
        </div>
      </div>
    </header>
  );
}
