const buckets = new Map();

export function rateLimit(req, res, { key = 'default', limit = 20, windowMs = 60_000 } = {}) {
  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const current = buckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  if (current.count > limit) {
    res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    res.status(429).json({ success: false, message: 'Слишком много запросов. Попробуйте позже.' });
    return false;
  }
  return true;
}
