import { LoginClient } from '@/components/auth/LoginClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | NihongoQuest',
  description: 'Sign in to NihongoQuest to continue your Japanese learning journey.',
};

export default function LoginPage() {
  return <LoginClient />;
}
