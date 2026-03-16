/**
 * Simple in-memory rate limiter.
 * Tracks attempts per key (usually IP address) within a sliding window.
 * 
 * For production with multiple server instances, replace with Redis.
 * For a single Vercel deployment, this works fine.
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    const expired = entry.blockedUntil
      ? now > entry.blockedUntil
      : now - entry.firstAttempt > 15 * 60 * 1000; // 15 min
    if (expired) store.delete(key);
  }
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  maxAttempts: number;    // Max attempts before blocking
  windowMs: number;       // Time window in ms
  blockDurationMs: number; // How long to block after exceeding
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,       // 15 minutes
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remainingAttempts: number; retryAfterMs: number | null } {
  const now = Date.now();
  const entry = store.get(key);

  // No previous attempts
  if (!entry) {
    store.set(key, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
      retryAfterMs: null,
    };
  }

  // Currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: entry.blockedUntil - now,
    };
  }

  // Block expired — reset
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    store.set(key, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
      retryAfterMs: null,
    };
  }

  // Window expired — reset
  if (now - entry.firstAttempt > config.windowMs) {
    store.set(key, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
      retryAfterMs: null,
    };
  }

  // Within window — increment
  entry.attempts += 1;

  if (entry.attempts > config.maxAttempts) {
    entry.blockedUntil = now + config.blockDurationMs;
    store.set(key, entry);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: config.blockDurationMs,
    };
  }

  store.set(key, entry);
  return {
    allowed: true,
    remainingAttempts: config.maxAttempts - entry.attempts,
    retryAfterMs: null,
  };
}

/**
 * Reset rate limit for a key (e.g., after successful login)
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}