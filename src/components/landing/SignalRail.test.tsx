import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SignalRail from './SignalRail';

describe('SignalRail', () => {
  it('renders the four APERFY truth stages in Spanish', () => {
    render(<SignalRail locale="es" />);
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText('Revisado')).toBeInTheDocument();
    expect(screen.getByText('Añadido')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });
});
