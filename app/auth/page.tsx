
import Link from 'next/link';
import { LoginForm } from '../../components/organisms/LoginForm';

export default function AuthPage() {
  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow mt-8">
      <LoginForm />
      <div className="mt-4 text-center">
        <span>Don't have an account? </span>
        <Link href="/auth/signup" className="text-blue-600 underline">Sign up</Link>
      </div>
    </div>
  );
}
