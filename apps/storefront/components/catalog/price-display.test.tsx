import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriceDisplay } from './price-display';

describe('PriceDisplay', () => {
  it('shows compare-at price first, selling price, and a sale badge', () => {
    render(<PriceDisplay price="1199.00" compareAt="4999.00" currency="INR" />);
    expect(screen.getByText('Rs. 1,199.00')).toBeInTheDocument();
    expect(screen.getByText('Rs. 4,999.00')).toBeInTheDocument();
    expect(screen.getByText('Sale')).toBeInTheDocument();
  });
});
