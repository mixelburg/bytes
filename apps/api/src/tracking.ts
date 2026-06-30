// Deterministic delivery timeline. Progress is derived purely from the order's
// createdAt + a fixed offset table, so every request (any device, after a
// refresh) agrees without storing per-step state or running a worker.

export type Address = {
  recipient: string | null;
  line1: string | null;
  city: string | null;
  postal: string | null;
  country: string | null;
};

export type StopState = 'done' | 'current' | 'pending';
export type Stop = { label: string; etaAt: string; state: StopState };
export type OrderStatus = 'processing' | 'in_transit' | 'out_for_delivery' | 'delivered';

export type Timeline = {
  status: OrderStatus;
  eta: string;
  stops: Stop[];
  currentIndex: number;
};

// ponytail: demo-compressed to ~3 min so progress is visible in a session.
// Bump toward real durations (hours) for production; offsets scale with it.
export const TRACKING_DURATION_MS = 3 * 60_000;

// Each leg's start offset as a fraction of TRACKING_DURATION_MS, plus a label
// builder (the city is woven into the middle hubs). Last entry = arrival.
const LEGS: { at: number; status: OrderStatus; label: (city: string) => string }[] = [
  { at: 0, status: 'processing', label: () => 'Warehouse — packed' },
  { at: 0.2, status: 'in_transit', label: (c) => `${c} sorting hub` },
  { at: 0.5, status: 'in_transit', label: () => 'In transit' },
  { at: 0.8, status: 'out_for_delivery', label: (c) => `${c} local depot` },
  { at: 1, status: 'delivered', label: () => 'Your address' },
];

export function buildTimeline(createdAt: Date, address: Address, now: Date): Timeline {
  const city = address.city?.trim() || 'Local';
  const start = createdAt.getTime();
  const elapsed = now.getTime() - start;

  // Current = last leg whose start time has passed; clamped to the final leg.
  let currentIndex = 0;
  for (let i = 0; i < LEGS.length; i++) {
    if (elapsed >= LEGS[i].at * TRACKING_DURATION_MS) currentIndex = i;
  }

  const stops: Stop[] = LEGS.map((leg, i) => ({
    label: leg.label(city),
    etaAt: new Date(start + leg.at * TRACKING_DURATION_MS).toISOString(),
    state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending',
  }));

  const delivered = currentIndex === LEGS.length - 1;
  if (delivered) for (const s of stops) s.state = 'done';

  return {
    status: LEGS[currentIndex].status,
    eta: new Date(start + TRACKING_DURATION_MS).toISOString(),
    stops,
    currentIndex,
  };
}
