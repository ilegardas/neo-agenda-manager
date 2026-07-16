import { Link } from "wouter";
import logoImg from "@assets/logo_migestion_png_1773789215959.png";

export default function PrivacyPage() {
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
          Política de Privacidad de migestion.pro
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Última actualización: 17 de marzo de 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">
          <p>
            En migestion.pro, la privacidad de nuestros usuarios y de los clientes finales de los negocios que utilizan
            nuestra plataforma es nuestra prioridad. Esta política describe cómo recopilamos, usamos y protegemos la
            información.
          </p>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">1. Información que Recopilamos</h2>
            <p className="mb-3">
              Para que nuestra plataforma funcione correctamente, manejamos dos tipos de datos:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Datos del Suscriptor (Dueño del negocio):</strong> Nombre, correo electrónico, datos de
                facturación y detalles del negocio.
              </li>
              <li>
                <strong>Datos del Cliente Final:</strong> Nombre, teléfono, correo electrónico y cualquier información
                adicional requerida por el negocio para la gestión de la cita (ej. motivo de consulta).
              </li>
              <li>
                <strong>Datos de Uso:</strong> Dirección IP, tipo de dispositivo y cookies para mejorar la experiencia
                del usuario.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">2. Uso de la Información</h2>
            <p className="mb-3">Utilizamos la información recopilada exclusivamente para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Gestionar las agendas:</strong> Facilitar la reserva, cancelación y reprogramación de citas.
              </li>
              <li>
                <strong>Notificaciones:</strong> Enviar confirmaciones y recordatorios vía SMS o correo electrónico.
              </li>
              <li>
                <strong>Soporte Técnico:</strong> Resolver incidencias y mejorar las funcionalidades de la plataforma.
              </li>
              <li>
                <strong>Seguridad:</strong> Prevenir actividades fraudulentas o accesos no autorizados.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">3. Compartición de Datos con Terceros</h2>
            <p className="mb-3">
              migestion.pro no vende ni alquila bases de datos a terceros. Solo compartimos datos en los siguientes
              casos:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Proveedores de Servicios:</strong> Herramientas de envío de correos (ej. SendGrid), pasarelas de
                pago (ej. Stripe) o servicios de hosting (ej. AWS).
              </li>
              <li>
                <strong>Cumplimiento Legal:</strong> Cuando sea requerido por una autoridad judicial competente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">4. Seguridad de los Datos</h2>
            <p className="mb-3">Implementamos medidas técnicas de alto nivel para proteger la información:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cifrado de datos en tránsito mediante protocolos SSL/TLS.</li>
              <li>Almacenamiento en servidores seguros con copias de seguridad periódicas.</li>
              <li>Acceso restringido a la base de datos solo a personal autorizado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">5. Derechos del Usuario (ARCO)</h2>
            <p className="mb-3">Tanto los suscriptores como sus clientes tienen derecho a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acceder a sus datos personales.</li>
              <li>Rectificar información inexacta.</li>
              <li>Cancelar o eliminar su cuenta y datos asociados.</li>
              <li>Oponerse al tratamiento de sus datos para fines específicos.</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos, puede escribirnos a:{" "}
              <a href="mailto:soporte@migestion.pro" className="text-primary hover:underline font-medium">
                soporte@migestion.pro
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-3">6. Cookies</h2>
            <p>
              Utilizamos cookies esenciales para mantener la sesión activa y cookies analíticas para entender cómo se
              usa la plataforma. Puedes desactivarlas en la configuración de tu navegador, aunque esto podría afectar el
              funcionamiento del sitio.
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
