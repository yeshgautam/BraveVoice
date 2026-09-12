const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function authenticate(req, res, next) {
  const token = req.headers.authorization;
  const secret = process.env.API_SECRET;
  if (!token || !secret || !timingSafeEqual(token, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { authenticate };
