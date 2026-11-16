import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aevi Wellness — Agenda tu cita',
  description: 'Elige el día, el horario y el servicio. Confirmamos tu cita al instante.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
