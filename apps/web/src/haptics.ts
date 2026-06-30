import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Light tap for confirming actions (add-to-cart). The Capacitor web shim falls
// back to the Vibration API and no-ops where unsupported; swallow any rejection
// so a missing capability never surfaces as an error.
export function tapHaptic() {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}
