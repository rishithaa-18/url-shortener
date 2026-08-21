const { UAParser } = require('ua-parser-js');

function parseUserAgent(userAgentString) {
  if (!userAgentString) {
    return { deviceType: 'unknown', browser: null, os: null };
  }

  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  // ua-parser-js reports device.type as 'mobile' | 'tablet' | undefined.
  // Undefined generally means desktop (no mobile/tablet signals found).
  const deviceType = result.device.type || 'desktop';

  return {
    deviceType,
    browser: result.browser.name || null,
    os: result.os.name || null,
  };
}

module.exports = { parseUserAgent };
