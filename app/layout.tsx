import '../styles/globals.css';
import { ToastProvider } from '../hooks/useToast';
import { ConditionalAdminLayout } from '../components/templates/ConditionalAdminLayout';

export const metadata = { title: "Auto Buyer Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto" style={{ maxWidth: '1920px' }}>
          <ToastProvider>
            <ConditionalAdminLayout>
              {children}
            </ConditionalAdminLayout>
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
