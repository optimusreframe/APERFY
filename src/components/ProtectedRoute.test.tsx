import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
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
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProtectedRoute redirectAdmin><div>Profile</div></ProtectedRoute>} />
          <Route path="/admin" element={<div>Admin console</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(screen.getByText('Admin console')).toBeInTheDocument();
  });
});
