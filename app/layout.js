import './globals.css';

export const metadata = {
  title: 'SDR Legare — Painel',
  description: 'Painel de prospecção outbound da Legare Gestão',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
