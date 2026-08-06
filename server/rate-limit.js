const buckets = new Map();
const MAX_BUCKETS = 10_000;

function clientIp(req) {
  return String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function prune(now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size > MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
}

export function rateLimit(req, res, { key = 'default', limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS || Math.random() < 0.01) prune(now);

  const bucketKey = `${key}:${clientIp(req)}`;
  const current = buckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - 1)));
    return true;
  }

  current.count += 1;
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - current.count)));
  if (current.count > limit) {
    res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    res.status(429).json({ success: false, code: 'RATE_LIMITED', message: 'Слишком много запросов. Попробуйте позже.' });
    return false;
  }
  return true;
}
