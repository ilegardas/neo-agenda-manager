import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";
import logoImg from "@assets/logo_migestion_png_1773789215959.png";
import { Footer } from "@/components/Footer";

export default function ResetPasswordPage() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al restablecer la contraseña.");
      setDone(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background">
      <header className="bg-white dark:bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <a href="/" className="flex items-center gap-2">
            <img src={logoImg} alt="migestion.pro" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-xl font-bold text-gray-900 dark:text-foreground">migestion.pro</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8">
            {!token ? (
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold">Enlace inválido</h2>
                <p className="text-muted-foreground text-sm">
                  Este enlace de recuperación no es válido o ha expirado.
                </p>
                <a href="/">
                  <Button className="w-full">Ir al inicio de sesión</Button>
                </a>
              </div>
            ) : done ? (
              <div className="text-center space-y-4">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                <h2 className="text-xl font-bold">¡Contraseña actualizada!</h2>
                <p className="text-muted-foreground text-sm">
                  Tu contraseña fue restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
                <a href="/">
                  <Button className="w-full h-11">Iniciar sesión</Button>
                </a>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto bg-primary/10 p-3 rounded-xl w-fit mb-4">
                    <img src={logoImg} alt="logo" className="h-8 w-8 rounded-full object-cover" />
                  </div>
                  <h2 className="text-2xl font-bold">Nueva contraseña</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Elige una contraseña segura para tu cuenta.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rp-password">Nueva contraseña</Label>
                    <div className="relative">
                      <Input
                        id="rp-password"
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        data-testid="input-new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rp-confirm">Confirmar contraseña</Label>
                    <Input
                      id="rp-confirm"
                      type={showPass ? "text" : "password"}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repite tu nueva contraseña"
                      required
                      data-testid="input-confirm-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold"
                    disabled={isPending}
                    data-testid="button-reset-submit"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Restablecer contraseña
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  <a href="/" className="text-primary font-semibold hover:underline">
                    Volver al inicio de sesión
                  </a>
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
