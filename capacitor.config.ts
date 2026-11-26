/**
 * Capacitor configuration template for future VEYRA Android / iOS builds.
 * See README.md ("Converting VEYRA to Android with Capacitor") for setup steps.
 */
const capacitorConfig = {
  appId: 'com.damayantinetwork.veyra',
  appName: 'VEYRA',
  webDir: 'out',
  server: {
    // Point Android wrapper to the deployed production Vercel URL during live shell wrapping:
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://veyra.example.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFCF8',
  },
};

export default capacitorConfig;
