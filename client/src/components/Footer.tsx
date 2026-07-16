import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-white border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>© 2026 migestion.pro — Todos los derechos reservados.</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Política de Privacidad
          </Link>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Términos y Condiciones
          </Link>
        </div>
      </div>
    </footer>
  );
}
