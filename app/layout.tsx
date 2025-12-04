import '../styles/globals.css';
import { Providers } from './providers';
import { ConditionalAdminLayout } from '../components/templates/ConditionalAdminLayout';

export const metadata = { title: "Auto Buyer Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
