import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriceDisplay } from './price-display';

describe('PriceDisplay', () => {
  it('shows compare-at price first, selling price, and a sale badge', () => {
    render(<PriceDisplay price="2499.00" compareAt="2999.00" currency="INR" />);
    expect(screen.getByText(/2,499/)).toBeInTheDocument();
    expect(screen.getByText(/2,999/)).toBeInTheDocument();
    expect(screen.getByText('Sale')).toBeInTheDocument();
  });
});
