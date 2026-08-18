import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CatalogFilters } from './catalog-filters';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/products',
  useSearchParams: () => new URLSearchParams('sort=featured'),
}));

describe('category and catalog filters', () => {
  it('applies sorting and size filters via query params', async () => {
    const user = userEvent.setup();
    push.mockReset();
    render(
      <CatalogFilters
        facets={{ sizes: ['S', 'M'], colours: ['Red'], brands: ['Demo Athletic'], minPrice: '999.00', maxPrice: '4999.00' }}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Sort'), 'newest');
    expect(push).toHaveBeenCalledWith('/products?sort=newest');
    await user.selectOptions(screen.getByLabelText('Size'), 'M');
    expect(push).toHaveBeenCalledWith('/products?sort=featured&size=M');
  });
});
