import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FindNarrative from './FindNarrative';

describe('FindNarrative', () => {
  it('uses APERFY language instead of inherited print-service language', () => {
    render(<FindNarrative locale="en" />);
    expect(screen.getByText('A find becomes a better buy')).toBeInTheDocument();
    expect(screen.queryByText(/printing/i)).not.toBeInTheDocument();
  });
});
