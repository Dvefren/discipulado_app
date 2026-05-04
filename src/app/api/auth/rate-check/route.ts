import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Rate-limited login check endpoint.
 * 
 * The actual auth is handled by NextAuth's /api/auth/[...nextauth] route,
 * but we add this pre-check so the client can show rate limit messages.
 * 
 * The main protection is in the auth.ts authorize() callback.
 */
export async function POST(req: NextRequest) {
  // Get the client IP
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const key = `login:${ip}`;

  const { allowed, remainingAttempts, retryAfterMs } = await checkRateLimit(key, {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,       // 15 min window
    blockDurationMs: 15 * 60 * 1000, // Block 15 min
  });

  if (!allowed) {
    const minutes = Math.ceil((retryAfterMs || 0) / 60000);
    return NextResponse.json(
      {
        error: `Too many login attempts. Please try again in ${minutes} minutes.`,
        retryAfterMs,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((retryAfterMs || 0) / 1000)),
        },
      }
    );
  }

  return NextResponse.json({
    allowed: true,
    remainingAttempts,
  });
}