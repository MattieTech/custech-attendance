/**
 * Client-Side Device Telemetry & Intelligent Fingerprinting for CUSTECH
 * Captures non-intrusive browser/device signals for institutional anti-fraud telemetry.
 */

export interface DeviceTelemetry {
  deviceFingerprintHash: string;
  userAgent: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  browser: string;
  os: string;
}

export function getClientDeviceTelemetry(): DeviceTelemetry {
  if (typeof window === 'undefined') {
    return {
      deviceFingerprintHash: 'srv_fingerprint',
      userAgent: 'Server-Side',
      deviceType: 'Desktop',
      browser: 'Server',
      os: 'Server',
    };
  }

  // 1. Persistent Hardware-level UUID (stored in localStorage)
  let deviceUuid = '';
  try {
    deviceUuid = localStorage.getItem('custech_device_hw_uuid') || '';
    if (!deviceUuid) {
      deviceUuid = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('custech_device_hw_uuid', deviceUuid);
    }
  } catch {
    deviceUuid = `temp_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 2. Hardware and Environment Signals
  const ua = navigator.userAgent || '';
  const screenSignal = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const tz = Intl?.DateTimeFormat?.().resolvedOptions()?.timeZone || 'Africa/Lagos';
  const lang = navigator.language || 'en';

  // Compute lightweight hash of hardware signals + deviceUuid
  const rawString = `${deviceUuid}|${ua}|${screenSignal}|${tz}|${lang}`;
  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    hash = (hash << 5) - hash + rawString.charCodeAt(i);
    hash |= 0;
  }
  const deviceFingerprintHash = `fp_${Math.abs(hash).toString(16).padStart(8, '0')}`;

  // 3. Classify Device Type
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    deviceType = 'Mobile';
  }

  // 4. Detect Browser
  let browser = 'Chrome';
  if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  // 5. Detect OS
  let os = 'Windows';
  if (/Android/i.test(ua)) os = 'Android OS';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'Apple iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Microsoft Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return {
    deviceFingerprintHash,
    userAgent: ua,
    deviceType,
    browser,
    os,
  };
}
