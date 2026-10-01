// SSRF Guard and Input Validation

export function validateBaseUrl(urlStr: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(urlStr);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== 'https:' && protocol !== 'http:') {
      return { valid: false, error: 'Only http and https protocols are supported.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check for loopback / internal IPs when running in production
    // Allow localhost/127.0.0.1 for local Ollama/LM Studio users
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

    // AWS/GCP/Azure Cloud Metadata block
    if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
      return { valid: false, error: 'Access to metadata endpoints is strictly blocked.' };
    }

    // Private network block unless user is testing localhost
    if (
      !isLocalhost &&
      (hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname))
    ) {
      return { valid: false, error: 'Private LAN IP addresses are disallowed for security.' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

// In-Memory Rate Limiter for Default Gemini Key
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(clientIp: string, maxRequests: number = 40, windowSeconds: number = 60): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientIp, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// Clean up stale rate limits every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(ip);
      }
    }
  }, 5 * 60 * 1000);
}
