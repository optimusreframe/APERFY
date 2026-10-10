import { render, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import TestMemoryRouter from '@/test/TestMemoryRouter';
import ProtectedRoute from './ProtectedRoute';

const authState = vi.hoisted(() => ({
  current: { user: { id: 'admin-user' }, isAdmin: true, loading: false },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState.current,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('ProtectedRoute', () => {
  it('redirects administrators away from the profile route to the admin console', () => {
    render(
      <TestMemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProtectedRoute redirectAdmin><div>Profile</div></ProtectedRoute>} />
          <Route path="/admin" element={<div>Admin console</div>} />
        </Routes>
      </TestMemoryRouter>,
    );

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(screen.getByText('Admin console')).toBeInTheDocument();
  });
});
