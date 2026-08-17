import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchBar } from './search-bar';

const push = vi.fn();
const search = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../../lib/api', () => ({
  storeApi: {
    search: (...args: unknown[]) => search(...args),
  },
}));

describe('SearchBar', () => {
  beforeEach(() => {
    push.mockReset();
    search.mockReset();
  });

  it('shows suggestions from the storefront search API', async () => {
    const user = userEvent.setup();
    search.mockResolvedValue({
      query: 'home',
      suggestions: [{ type: 'product', id: '1', name: 'Home Kit', slug: 'home-kit', href: '/products/home-kit', imageUrl: null }],
      products: [],
      meta: { page: 1, pageSize: 6, totalItems: 1, totalPages: 1, limit: 6, total: 1 },
    });
    render(<SearchBar />);
    await user.type(screen.getByLabelText('Search products'), 'home');
    expect(await screen.findByText('Home Kit')).toBeInTheDocument();
  });

  it('shows a no-results state when the API returns no matches', async () => {
    const user = userEvent.setup();
    search.mockResolvedValue({
      query: 'zzzz',
      suggestions: [],
      products: [],
      meta: { page: 1, pageSize: 6, totalItems: 0, totalPages: 0, limit: 6, total: 0 },
    });
    render(<SearchBar />);
    await user.type(screen.getByLabelText('Search products'), 'zzzz');
    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument();
    });
  });

  it('navigates to the product listing with the search query', async () => {
    const user = userEvent.setup();
    search.mockResolvedValue({
      query: 'kit',
      suggestions: [],
      products: [],
      meta: { page: 1, pageSize: 6, totalItems: 0, totalPages: 0, limit: 6, total: 0 },
    });
    render(<SearchBar />);
    await user.type(screen.getByLabelText('Search products'), 'kit');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/products?search=kit');
  });
});
