import { render } from '@testing-library/react';
import PointerGlow from './PointerGlow';

describe('PointerGlow', () => {
  it('renders as decorative content', () => {
    const { container } = render(<PointerGlow />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
