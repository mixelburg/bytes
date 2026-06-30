// Display + commerce helpers shared across screens. Kept independent of any
// data source so they survive the mock catalog's removal.

export const money = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Price label for a list item: a single price or a range. */
export const priceLabel = (min: number, max: number) =>
  min === max ? money(min) : `${money(min)}–${money(max)}`;

/** Flat shipping: free over $75, otherwise $6 (free when cart is empty → $0). */
export const shippingFor = (subtotal: number) =>
  subtotal > 0 && subtotal < 75 ? 6 : 0;

export const stockColor = (stock: number) =>
  stock === 0 ? '#d0503f' : stock <= 5 ? '#c08a2e' : '#2e9e5b';
