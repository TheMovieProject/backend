const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72; // bcrypt only uses first 72 bytes
const NAME_MAX_LENGTH = 80;
const BIO_MAX_LENGTH = 500;
const AVATAR_URL_MAX_LENGTH = 2000;

type RateLimitOptions = {
  windowMs: number;
  max: number;
  blockMs?: number;
};

type RateLimitBucket = {
  count: number;
  windowStart: number;
  blockedUntil: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

const RATE_LIMIT_STORE_KEY = "__authRateLimitStore";

function getRateLimitStore(): Map<string, RateLimitBucket> {
  const globalWithStore = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_KEY]?: Map<string, RateLimitBucket>;
  };

  if (!globalWithStore[RATE_LIMIT_STORE_KEY]) {
    globalWithStore[RATE_LIMIT_STORE_KEY] = new Map<string, RateLimitBucket>();
  }

  return globalWithStore[RATE_LIMIT_STORE_KEY]!;
}

function getHeaderValue(headers: unknown, name: string): string | undefined {
  if (!headers) return undefined;

  const lower = name.toLowerCase();
  const maybeGet = (headers as { get?: (key: string) => string | null }).get;
  if (typeof maybeGet === "function") {
    return maybeGet(lower) ?? maybeGet(name) ?? undefined;
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const direct =
    record[name] ??
    record[lower] ??
    record[name.toUpperCase()] ??
    record[name.replace(/-/g, "_")] ??
    record[lower.replace(/-/g, "_")];

  if (typeof direct === "string") return direct;
  if (Array.isArray(direct) && typeof direct[0] === "string") return direct[0];
  return undefined;
}

function safeTrim(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toNullIfEmpty(value: string): string | null {
  return value.length > 0 ? value : null;
}

function cleanupRateLimitStore(now: number): void {
  const store = getRateLimitStore();

  for (const [key, bucket] of store.entries()) {
    const windowExpired = now - bucket.windowStart > bucket.windowMs;
    const blockExpired = bucket.blockedUntil <= now;
    if (windowExpired && blockExpired) {
      store.delete(key);
    }
  }
}

export function normalizeEmail(value: unknown): string {
  return safeTrim(value).toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

export function normalizeUsername(value: unknown): string | null {
  const username = safeTrim(value).toLowerCase();
  if (!USERNAME_RE.test(username)) return null;
  return username;
}

export function sanitizeName(value: unknown): string {
  const name = safeTrim(value).replace(/\s+/g, " ");
  return name.slice(0, NAME_MAX_LENGTH);
}

export function sanitizeBio(value: unknown): string | null {
  const bio = safeTrim(value);
  if (!bio) return null;
  return bio.slice(0, BIO_MAX_LENGTH);
}

export function sanitizeAvatarUrl(value: unknown): string | null {
  const avatarUrl = safeTrim(value);
  if (!avatarUrl) return null;
  if (avatarUrl.length > AVATAR_URL_MAX_LENGTH) return null;

  if (avatarUrl.startsWith("data:image/")) {
    return avatarUrl;
  }

  try {
    const parsed = new URL(avatarUrl);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Password must be at least 8 characters long.";
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return "Password is too long.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/\d/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one symbol.";
  }
  return null;
}

export function getClientIp(req: { headers?: unknown } | Request): string {
  const headers = req?.headers;

  const forwardedFor =
    getHeaderValue(headers, "x-forwarded-for") ??
    getHeaderValue(headers, "x-real-ip") ??
    getHeaderValue(headers, "cf-connecting-ip");

  if (!forwardedFor) return "unknown";

  const first = forwardedFor.split(",")[0]?.trim();
  return first || "unknown";
}

export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  cleanupRateLimitStore(now);
  const store = getRateLimitStore();
  const blockMs = options.blockMs ?? options.windowMs;

  const existing = store.get(key);
  if (
    !existing ||
    now - existing.windowStart >= options.windowMs ||
    existing.windowMs !== options.windowMs
  ) {
    store.set(key, {
      count: 1,
      windowStart: now,
      blockedUntil: 0,
      windowMs: options.windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(0, options.max - 1),
      retryAfterSec: 0,
    };
  }

  if (existing.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(
        1,
        Math.ceil((existing.blockedUntil - now) / 1000)
      ),
    };
  }

  existing.count += 1;

  if (existing.count > options.max) {
    existing.blockedUntil = now + blockMs;
    store.set(key, existing);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil(blockMs / 1000)),
    };
  }

  store.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, options.max - existing.count),
    retryAfterSec: 0,
  };
}

export function clearRateLimit(key: string): void {
  getRateLimitStore().delete(key);
}

export function toNullableString(value: unknown): string | null {
  const str = safeTrim(value);
  return toNullIfEmpty(str);
}
