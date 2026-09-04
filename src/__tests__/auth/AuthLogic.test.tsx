import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, type Mock } from 'vitest';
import { LoginClient } from '@/components/auth/LoginClient';
import { createClient } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(),
}));

describe('LoginClient Component', () => {
  it('renders login form and google login button', () => {
    render(<LoginClient />);
    // Use placeholder values that actually exist in LoginClient
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    // Google button uses aria-label from t('auth.loginWithGoogle')
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('shows validation errors for invalid input', async () => {
    render(<LoginClient />);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    // Submit form kosong
    fireEvent.click(submitBtn);

    // LoginClient renders its own error messages (not raw Zod messages)
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('calls Supabase signInWithPassword on valid submission', async () => {
    const signInMock = vi.fn().mockResolvedValue({ data: {}, error: null });
    (createClient as Mock).mockReturnValue({
      auth: { signInWithPassword: signInMock },
    });

    render(<LoginClient />);

    // Use actual placeholder values
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});
