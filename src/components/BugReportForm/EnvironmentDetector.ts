export function parseBrowser(ua: string): string {
  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/(\d+)/);
    return `Firefox ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)/);
    return `Edge ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/(\d+)/);
    return `Chrome ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const match = ua.match(/Version\/(\d+)/);
    return `Safari ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('MSIE') || ua.includes('Trident/')) {
    return 'Internet Explorer';
  }
  return 'Unknown Browser';
}

export function parseOS(ua: string): string {
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (ua.includes('Windows NT 6.2')) return 'Windows 8';
  if (ua.includes('Windows NT 6.1')) return 'Windows 7';
  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    const version = match ? match[1].replace('_', '.') : '';
    return `macOS ${version}`.trim();
  }
  if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+)/);
    return `Android ${match ? match[1] : ''}`.trim();
  }
  if (ua.includes('iPhone') || ua.includes('iPad')) {
    const match = ua.match(/OS (\d+_\d+)/);
    const version = match ? match[1].replace('_', '.') : '';
    return `iOS ${version}`.trim();
  }
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown OS';
}

export function detectEnvironment(appVersion?: string) {
  if (typeof window === 'undefined') {
    return {
      browser: 'SSR',
      os: 'SSR',
      screen_resolution: 'N/A',
      app_version: appVersion || 'unknown',
    };
  }

  const ua = navigator.userAgent;
  return {
    browser: parseBrowser(ua),
    os: parseOS(ua),
    screen_resolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    app_version: appVersion || 'unknown',
  };
}
