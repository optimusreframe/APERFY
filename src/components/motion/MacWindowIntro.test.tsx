import { render, screen } from '@testing-library/react';
import MacWindowIntro from './MacWindowIntro';

describe('MacWindowIntro', () => {
  it('keeps its content visible and accessible', () => {
    render(<MacWindowIntro><h1>APERFY Store</h1></MacWindowIntro>);
    expect(screen.getByRole('heading', { name: 'APERFY Store' })).toBeInTheDocument();
  });
});
