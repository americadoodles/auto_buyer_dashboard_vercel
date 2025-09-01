"use client";

import Link from 'next/link';
import { SignupForm } from '../../../components/organisms/SignupForm';

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto p-4 border rounded shadow mt-8">
      <SignupForm />
      <div className="mt-4 text-center">
        <span>Already have an account? </span>
        <Link href="/auth" className="text-blue-600 underline">Login</Link>
      </div>
    </div>
  );
}
