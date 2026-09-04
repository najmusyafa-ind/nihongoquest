import { RegisterClient } from '@/components/auth/RegisterClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | NihongoQuest',
  description: 'Create an account and start mastering Japanese.',
};

export default function RegisterPage() {
  return <RegisterClient />;
}
