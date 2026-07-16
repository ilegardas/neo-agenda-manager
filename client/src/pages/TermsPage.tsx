import { Link } from "wouter";
import logoImg from "@assets/logo_migestion_png_1773789215959.png";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <img src={logoImg} alt="migestion.pro" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-xl font-bold font-display text-gray-900">migestion.pro</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
          Términos y Condiciones de Uso – migestion.pro
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Fecha de entrada en vigor: 17 de marzo de 2026</p>

        <div className="space-y-8 text-gray-700">
          <p>
            El presente documento constituye el acuerdo legal entre migestion.pro (en adelante, "La Plataforma") y el
            usuario profesional o empresa (en adelante, "El Suscriptor") que contrata nuestros servicios de gestión de
            agendas online.
          </p>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">1. Descripción del Servicio</h2>
            <p className="mb-3">migestion.pro es una herramienta SaaS que permite al Suscriptor:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Gestionar calendarios y horarios de atención.</li>
              <li>Permitir que sus clientes finales realicen reservas online.</li>
              <li>Facilitar el contacto entre el cliente y su cliente final.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">2. Registro y Responsabilidad de la Cuenta</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>El Suscriptor debe proporcionar información real y actualizada.</li>
              <li>La seguridad de la contraseña es responsabilidad exclusiva del Suscriptor.</li>
              <li>migestion.pro no se hace responsable por el uso indebido de la cuenta por parte de terceros.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">3. Planes y Pagos</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Suscripciones:</strong> El acceso a la plataforma se basa en planes mensuales o anuales.</li>
              <li><strong>Pagos:</strong> Se realizarán por adelantado mediante los métodos de pago habilitados.</li>
              <li>
                <strong>Mora:</strong> El impago de la suscripción resultará en la suspensión temporal del servicio
                tras un aviso previo de 5 días hábiles.
              </li>
              <li>
                <strong>Cancelación:</strong> El Suscriptor puede cancelar su suscripción en cualquier momento,
                manteniendo el acceso hasta el final del periodo pagado.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">4. Propiedad Intelectual</h2>
            <p>
              Todo el software, diseño, logotipos y código fuente de migestion.pro son propiedad exclusiva de la
              plataforma. Se otorga al Suscriptor una licencia de uso no exclusiva, limitada y revocable para los fines
              comerciales del negocio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">
              5. Responsabilidad sobre el Contenido y Clientes Finales
            </h2>
            <p className="mb-3 font-medium">
              Importante: El Suscriptor es el único responsable de la relación con sus clientes finales. migestion.pro
              es solo un facilitador tecnológico.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                El Suscriptor garantiza que tiene el consentimiento de sus clientes para introducir sus datos en la
                plataforma.
              </li>
              <li>
                La Plataforma no interviene en las disputas comerciales entre el negocio y sus clientes (por ejemplo,
                cancelaciones de última hora o reembolsos de servicios).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">6. Limitación de Responsabilidad</h2>
            <p className="mb-3">
              Aunque trabajamos para que el sistema esté disponible el 99.9% del tiempo, migestion.pro no garantiza que
              el servicio sea ininterrumpido. No seremos responsables por:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Caídas de red externas o problemas de hosting fuera de nuestro control.</li>
              <li>Pérdida de beneficios debido a errores en la gestión de citas por parte del Suscriptor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">7. Modificaciones de los Términos</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos para adaptarlos a nuevas funciones o leyes. Se
              notificará a los Suscriptores vía correo electrónico con al menos 15 días de antelación.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">8. Ley Aplicable y Jurisdicción</h2>
            <p>
              Cualquier conflicto relacionado con estos términos se resolverá bajo las leyes de Chihuahua México y ante
              los tribunales de ciudad Chihuahua.
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-border mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>© 2026 migestion.pro — Todos los derechos reservados.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-primary transition-colors">Política de Privacidad</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Términos y Condiciones</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
