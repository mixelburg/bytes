import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bytes.marketplace',
  appName: 'Bytes',
  // Nx emits the web build here; `cap sync` copies it into the native shells.
  webDir: 'dist/apps/web',
};

export default config;
