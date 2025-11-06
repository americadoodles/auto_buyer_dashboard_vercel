import '../styles/globals.css';
import { ToastProvider } from '../hooks/useToast';

export const metadata = { title: "Auto Buyer Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
