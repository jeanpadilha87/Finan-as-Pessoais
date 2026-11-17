const crypto = require("crypto");
const authConfig = require("../config/auth");
const { cookie } = authConfig;

const cookieOptions = `Path=/; SameSite=${cookie.sameSite}${cookie.secure ? "; Secure" : ""}`;

function readCookie(req, name) {
    const value = (req.headers.cookie || "").split("; ").find((part) => part.startsWith(`${name}=`));
    return value ? value.slice(name.length + 1) : null;
}

function createCsrfToken() {
    const nonce = crypto.randomBytes(32).toString("hex");
    const signature = crypto.createHmac("sha256", authConfig.jwt.secret).update(nonce).digest("hex");
    return `${nonce}.${signature}`;
}

function issueCsrf(_req, res) {
    const token = createCsrfToken();
    res.setHeader("Set-Cookie", `csrf=${token}; ${cookieOptions}`);
    return res.json({ csrfToken: token });
}

function csrfProtection(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const cookieToken = readCookie(req, "csrf");
    const headerToken = req.get("x-csrf-token");
    const cookieBuffer = cookieToken && Buffer.from(cookieToken);
    const headerBuffer = headerToken && Buffer.from(headerToken);
    if (!cookieBuffer || !headerBuffer || cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
        return res.status(403).json({ error: "Invalid CSRF token." });
    }

    const [nonce, suppliedSignature] = cookieToken.split(".");
    if (!/^[a-f0-9]{64}$/.test(nonce || "") || !/^[a-f0-9]{64}$/.test(suppliedSignature || "")) {
        return res.status(403).json({ error: "Invalid CSRF token." });
    }
    const expectedSignature = crypto.createHmac("sha256", authConfig.jwt.secret).update(nonce).digest();
    const signatureBuffer = Buffer.from(suppliedSignature, "hex");
    if (signatureBuffer.length !== expectedSignature.length || !crypto.timingSafeEqual(signatureBuffer, expectedSignature)) {
        return res.status(403).json({ error: "Invalid CSRF token." });
    }
    return next();
}

module.exports = { issueCsrf, csrfProtection, cookieOptions, createCsrfToken };
