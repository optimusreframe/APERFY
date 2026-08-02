import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SignalBench from './SignalBench';

describe('SignalBench', () => {
  it('exposes the signal state as an accessible APERFY instrument', () => {
    render(<SignalBench locale="en" reducedMotionLabel="Motion reduced" />);
    expect(screen.getByRole('img', { name: 'APERFY value signal bench' })).toBeInTheDocument();
    expect(screen.getByText('Signal locked')).toBeInTheDocument();
  });
});
