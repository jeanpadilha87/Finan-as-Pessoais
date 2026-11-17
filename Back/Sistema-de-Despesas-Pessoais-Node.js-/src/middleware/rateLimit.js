function rateLimit({ windowMs, max, message }) {
    const buckets = new Map();
    let requestsSinceCleanup = 0;
    return function limitRequests(req, res, next) {
        const now = Date.now();
        const key = req.ip || req.socket.remoteAddress || "unknown";
        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        bucket.count += 1;

        requestsSinceCleanup += 1;
        if (requestsSinceCleanup >= 256 || buckets.size > 10000) {
            requestsSinceCleanup = 0;
            for (const [address, record] of buckets) {
                if (record.resetAt <= now) buckets.delete(address);
            }
            if (buckets.size > 10000) buckets.delete(buckets.keys().next().value);
        }

        if (bucket.count > max) {
            const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
            res.setHeader("Retry-After", String(retryAfter));
            return res.status(429).json({ error: message || "Muitas requisições. Tente novamente mais tarde." });
        }
        return next();
    };
}

module.exports = rateLimit;
