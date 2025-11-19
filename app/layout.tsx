import '../styles/globals.css';
import { ToastProvider } from '../hooks/useToast';

export const metadata = { title: "Auto Buyer Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto" style={{ maxWidth: '1920px' }}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
