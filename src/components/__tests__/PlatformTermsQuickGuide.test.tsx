import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { PlatformTermsQuickGuide } from '../ui/PlatformTermsQuickGuide';

describe('PlatformTermsQuickGuide', () => {
  test('keeps the compact layout capped at two columns', () => {
    render(
      <MemoryRouter>
        <PlatformTermsQuickGuide density="compact" />
      </MemoryRouter>
    );

    const grid = screen.getByTestId('platform-terms-quick-guide-grid');

    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).not.toHaveClass('xl:grid-cols-5');
  });
});