import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Cache de instances de Ratelimit por configuración
// (evita crear una nueva cada call)
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(config: RateLimitConfig): Ratelimit {
  const cacheKey = `${config.maxAttempts}-${config.windowMs}-${config.blockDurationMs}`;
  
  if (!limiterCache.has(cacheKey)) {
    const windowSeconds = Math.floor(config.windowMs / 1000);
    limiterCache.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.maxAttempts, `${windowSeconds} s`),
        analytics: true,
        prefix: "rl",
      })
    );
  }
  
  return limiterCache.get(cacheKey)!;
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockDurationMs: 15 * 60 * 1000,
};

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remainingAttempts: number; retryAfterMs: number | null }> {
  const limiter = getLimiter(config);
  const result = await limiter.limit(key);
  
  return {
    allowed: result.success,
    remainingAttempts: result.remaining,
    retryAfterMs: result.success ? null : result.reset - Date.now(),
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  // Upstash Ratelimit no expone un reset directo, pero puedes
  // invalidar la key manualmente:
  await redis.del(`rl:${key}`);
}