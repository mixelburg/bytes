import { api } from '../api/client';
import { type CartEntry, hydrateCart } from './cart-slice';
import { store } from './index';
import { hydrateSaved } from './saved-slice';

// Persists cart + saved to the backend, scoped to the anonymous session. One
// bootstrap read seeds Redux; one subscribe is the ONLY thing that writes the
// session blob. Started once from main.tsx.
export async function initSessionSync(): Promise<void> {
  // Hydrate from the server; degrade silently to empty state if the API is down.
  try {
    const res = await api.session.$get();
    if (res.ok) {
      // cart/saved come back as opaque JSON blobs (Prisma Json columns); we own
      // their shape on the write side, so narrow them here.
      const { cart, saved } = await res.json();
      store.dispatch(hydrateCart((cart as unknown as CartEntry[]) ?? []));
      store.dispatch(hydrateSaved((saved as unknown as number[]) ?? []));
    }
  } catch {
    /* offline → start empty, user can still browse cached data */
  }

  // Set up the writer AFTER hydrate so seeding doesn't trigger a redundant PUT.
  // RTK keeps slice refs stable when unchanged, so the equality check skips
  // writes when an unrelated slice (e.g. order) changes.
  let last = {
    cart: store.getState().cart.items,
    saved: store.getState().saved.ids,
  };
  let timer: ReturnType<typeof setTimeout> | undefined;

  store.subscribe(() => {
    const s = store.getState();
    if (s.cart.items === last.cart && s.saved.ids === last.saved) return;
    last = { cart: s.cart.items, saved: s.saved.ids };
    clearTimeout(timer);
    // ponytail: 500ms debounce coalesces qty-spam into one write; last-write-wins
    // is fine for a single-browser session.
    timer = setTimeout(() => {
      api.session
        .$put({ json: { cart: Object.values(s.cart.items), saved: s.saved.ids } })
        .catch(() => {
          /* best-effort persistence; a dropped write retries on the next change */
        });
    }, 500);
  });
}
