import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bakedandshredded.app',
  appName: 'Baked & Shredded',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      iosIsEncryption: false,
    },
  },
};

export default config;
