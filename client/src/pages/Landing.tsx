import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock, Calendar, LogIn, UserPlus, Loader2, Eye, EyeOff,
  Sun, Moon, UtensilsCrossed, Grid3X3, Smartphone, MapPin, FileText, CheckSquare,
  BarChart3, Zap, Shield, Star, ArrowRight, FolderKanban, Check, Sparkles, Laptop, Monitor
} from "lucide-react";
import logoImg from "@assets/logo_migestion_png_1773789215959.png";
import { Footer } from "@/components/Footer";
import { useLogin, useRegister, useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";

const MAIN_FEATURES = [
  {
    icon: Calendar,
    color: "from-blue-500 to-cyan-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-600 dark:text-blue-400",
    title: "Agenda de Citas Online",
    desc: "Tus clientes reservan 24/7 desde su celular. Confirmaciones automáticas y gestión de horarios sin llamadas.",
  },
  {
    icon: UtensilsCrossed,
    color: "from-amber-500 to-orange-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-600 dark:text-amber-400",
    title: "Menú & Catálogo Digital",
    desc: "Publica tus productos, platillos o servicios con fotos y precios. Tu propia Landing Page lista para vender.",
  },
  {
    icon: Clock,
    color: "from-emerald-500 to-teal-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
    title: "Checador GPS Multisucursal",
    desc: "Control de asistencia de tus empleados con validación geográfica. Evita trampas y recibe reportes en tu correo.",
  },
];

const OTHER_FEATURES = [
  { icon: Smartphone, title: "App PWA Instalable", desc: "Instálala en Android, iOS o PC en 1 clic como acceso rápido, sin tiendas de apps." },
  { icon: MapPin, title: "Geofencing por Sucursal", desc: "Define ubicaciones permitidas para checar asistencia por cada sucursal." },
  { icon: FileText, title: "Minutas de Reunión", desc: "Documenta acuerdos, compromisos y tareas tras cada sesión de trabajo." },
  { icon: CheckSquare, title: "Checklist de Tareas", desc: "Asigna pendientes operativos y monitorea el avance en tiempo real." },
  { icon: FolderKanban, title: "Tableros Kanban/Scrum", desc: "Organiza proyectos de tu equipo con sprints, backlog y responsables." },
  { icon: BarChart3, title: "Reportes & Métricas", desc: "Estadísticas claras de citas, ventas y asistencia para tomar decisiones." },
];

const PLAN_BENEFITS = [
  "Agenda de Citas Ilimitada",
  "Menú & Catálogo Digital interactivo",
  "Reloj Checador con GPS Multisucursal",
  "Aplicación PWA para Celular y Computadora",
  "Gestión de Proyectos, Minutas y Tareas",
  "Soporte y actualizaciones continuas",
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
                <p className="text-sm text-muted-foreground mt-1">Ingresa a tu panel de control</p>
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
                  ¿Aún no tienes cuenta?{" "}
                  <button onClick={() => { setMode("register"); resetForm(); }} className="text-primary font-semibold hover:underline" data-testid="link-go-register">Crear mi cuenta</button>
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
                <h2 className="text-2xl font-bold">Registrar mi Negocio</h2>
                <p className="text-sm text-muted-foreground mt-1">Acceso inmediato a todos los módulos por $300/mes</p>
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
                <Button type="submit" className="w-full h-11 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white" disabled={register.isPending} data-testid="button-register-submit">
                  {register.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Comenzar Ahora
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

      {/* HERO HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-950 text-white py-20 md:py-28">
        <div className="absolute inset-0 opacity-25" style={{backgroundImage: "radial-gradient(circle at 20% 40%, #2563eb 0%, transparent 50%), radial-gradient(circle at 80% 60%, #10b981 0%, transparent 40%)"}} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-semibold text-emerald-400 mb-6">
                <Sparkles className="w-4 h-4" />
                App PWA: Instálala en Celular y PC sin tiendas
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.15]">
                Todo tu negocio bajo control: <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                  Citas, Menú y Checador GPS
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-300 max-w-2xl mb-8 leading-relaxed mx-auto lg:mx-0">
                La solución integral en la nube para gestionar tus sucursales, automatizar tus citas online y controlar la asistencia de tus empleados en tiempo real.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/25 transition-all"
                  onClick={() => setMode("register")}
                  data-testid="button-hero-register"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Empieza por $300 MXN/mes
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg font-semibold border-slate-700 text-white hover:bg-slate-900 bg-transparent"
                  onClick={() => setMode("login")}
                  data-testid="button-hero-login"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Iniciar Sesión
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                ✓ Sin contratos forzosos &nbsp;•&nbsp; ✓ Configuración en minutos
              </p>
            </div>

            {/* Right Card / Visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-6">
                  <img src={logoImg} alt="migestion.pro" className="h-12 w-12 rounded-full object-cover shadow" />
                  <div>
                    <div className="font-bold text-lg">migestion.pro</div>
                    <div className="text-xs text-slate-400">Plataforma Cloud para Pymes</div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg text-sm">
                    <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /> Agenda pública</span>
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-medium">Activa</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg text-sm">
                    <span className="flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-amber-400" /> Menú / Catálogo</span>
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-medium">Publicado</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg text-sm">
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-400" /> Checador GPS Sucursales</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-medium">GPS Activo</span>
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-center">
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block mb-1">Precio Transparente</span>
                  <div className="text-3xl font-extrabold text-white">$300 <span className="text-sm font-normal text-slate-300">MXN / mes</span></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* THREE PRINCIPAL MODULES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-foreground">
              Las 3 Herramientas Clave para tu Empresa
            </h2>
            <p className="text-muted-foreground mt-3 text-lg max-w-2xl mx-auto">
              Diseñadas para simplificar las operaciones diarias de negocios locales y servicios.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MAIN_FEATURES.map((f) => (
              <Card key={f.title} className="border border-border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-6`}>
                    <f.icon className={`w-7 h-7 ${f.text}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-foreground mb-3">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PWA FEATURE BANNER */}
      <section className="py-16 px-4 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-wider">
              <Smartphone className="w-4 h-4" /> Tecnología PWA
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold">Instálalo en tu Teléfono o Computadora</h3>
            <p className="text-slate-300 text-sm max-w-xl">
              Sin ocupar espacio pesado ni pasar por la App Store o Google Play. Accede directamente como un icono en la pantalla de inicio de tus celulares o PC.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl text-sm font-medium">
              <Smartphone className="w-5 h-5 text-emerald-400" /> Móvil (iOS/Android)
            </div>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl text-sm font-medium">
              <Laptop className="w-5 h-5 text-blue-400" /> Escritorio (PC/Mac)
            </div>
          </div>
        </div>
      </section>

      {/* ALL FEATURES GRID */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-card/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-foreground">
              Más módulos integrados sin costo extra
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Todo incluido en la misma suscripción mensual.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {OTHER_FEATURES.map((item) => (
              <div key={item.title} className="bg-white dark:bg-card p-6 rounded-xl border border-border/80 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg text-primary shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-foreground mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-foreground mb-4">
            Un Solo Plan. Todo Incluido.
          </h2>
          <p className="text-muted-foreground text-lg mb-12">
            Sin niveles complejos ni tarifas ocultas. Acceso completo para hacer crecer tu negocio.
          </p>

          <Card className="max-w-md mx-auto border-2 border-emerald-500 shadow-2xl relative overflow-hidden">
            <div className="bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-1.5">
              Plan Profesional Único
            </div>
            <CardContent className="p-8">
              <div className="flex justify-center items-baseline mb-6">
                <span className="text-5xl font-extrabold text-slate-900 dark:text-foreground">$300</span>
                <span className="text-slate-500 font-medium ml-2">MXN / mes</span>
              </div>

              <ul className="space-y-3 text-left mb-8">
                {PLAN_BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className="w-full h-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white text-base shadow-md"
                onClick={() => setMode("register")}
              >
                Registrarme Ahora
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA FOOTER */}
      <section className="py-16 px-4 bg-slate-950 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">Empieza a gestionar tu negocio hoy</h2>
          <p className="text-slate-400">Publica tu menú, habilita tu agenda de citas y controla tu personal desde un solo lugar.</p>
          <Button
            size="lg"
            className="h-14 px-10 text-lg font-bold bg-white text-slate-950 hover:bg-slate-100"
            onClick={() => setMode("register")}
          >
            Crear mi Cuenta por $300 MXN/mes
          </Button>
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
          <span className="text-lg font-bold text-slate-900 dark:text-foreground tracking-tight">migestion.pro</span>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground" data-testid="button-toggle-theme" title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" className="font-semibold hidden sm:inline-flex" onClick={onLogin} data-testid="button-login">
            Iniciar Sesión
          </Button>
          <Button className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onRegister} data-testid="button-register">
            <UserPlus className="w-4 h-4 mr-1.5 hidden sm:block" />
            Registrarse
          </Button>
        </div>
      </div>
    </header>
  );
}
