const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth");
const { AuthSession } = require("../models");

module.exports = async function authMiddleware(req, res, next) {
    const cookie = (req.headers.cookie || "").split("; ").find((part) => part.startsWith("session="));
    const token = cookie?.slice("session=".length);
    if (!token) return res.status(401).json({ error: "Unauthenticated session." });

    let decoded;
    try {
        decoded = jwt.verify(token, authConfig.jwt.secret, { algorithms: ["HS256"] });
    } catch {
        return res.status(401).json({ error: "Invalid or expired session." });
    }
    if (!decoded.jti) return res.status(401).json({ error: "Revoked or invalid session." });

    const session = await AuthSession.findOne({ where: { id: decoded.jti, userId: decoded.id, revokedAt: null } });
    if (!session || session.expiresAt <= new Date()) return res.status(401).json({ error: "Revoked or expired session." });
    req.sessionId = decoded.jti;
    req.user = { id: decoded.id, email: decoded.email, accountType: decoded.accountType };
    return next();
};
