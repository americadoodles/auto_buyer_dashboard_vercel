import '../styles/globals.css';
import { Providers } from './providers';
import { Cinzel, Lato } from "next/font/google";
import { ConditionalAdminLayout } from '../components/templates/ConditionalAdminLayout';

export const metadata = { title: "Auto Buyer Demo" };

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-lato",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${cinzel.variable} ${lato.variable}`}>
      <body className="min-h-screen">
        <Providers>
          <div className="mx-auto" style={{ maxWidth: '1920px' }}>
            <ConditionalAdminLayout>
              {children}
            </ConditionalAdminLayout>
          </div>
        </Providers>
      </body>
    </html>
  );
}
