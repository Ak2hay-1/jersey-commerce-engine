import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './empty-state';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe('EmptyState', () => {
  it('renders a real action, not a placeholder', () => {
    render(
      <EmptyState title="Your cart is empty" description="Add a kit to continue." actionHref="/products" actionLabel="Continue shopping" />,
    );
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/products');
  });
});
