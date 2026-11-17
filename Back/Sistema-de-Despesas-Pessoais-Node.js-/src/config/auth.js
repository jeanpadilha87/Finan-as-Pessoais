require("dotenv").config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET deve estar definido com pelo menos 32 caracteres.");
}

module.exports = {
    jwt: { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_EXPIRES_IN || "30m" },
    cookie: { secure: process.env.NODE_ENV === "production", sameSite: "Strict" }
};
