import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ng.edu.custech.attend',
  appName: 'CUSTECH Attendance',
  webDir: 'public',
  server: {
    // For local device testing: connect your Android phone to same Wi-Fi and set your PC's IP (e.g. http://192.168.X.X:4000)
    // Or use your deployed production domain (e.g. https://attend.custech.edu.ng)
    url: 'http://192.168.2.210:4000',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#faf8f5',
  },
};

export default config;
