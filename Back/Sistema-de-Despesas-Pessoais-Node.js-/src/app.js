require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
const userRoutes = require("./routes/userRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const { issueCsrf, csrfProtection } = require("./middleware/csrf");
const rateLimit = require("./middleware/rateLimit");

const app = express();
const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigin, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "X-CSRF-Token"] }));
app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.setHeader("Cache-Control", "no-store");
    if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
});
app.use(express.json({ limit: "32kb", strict: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));
app.get("/csrf", issueCsrf);
app.use(csrfProtection);
app.get("/", (_req, res) => res.json({ message: "API de finanças pessoais online." }));
app.use("/", userRoutes);
app.use("/", expenseRoutes);
app.use("/", categoryRoutes);
app.use((err, _req, res, _next) => {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "O recibo deve ter até 5 MB." });
    if (err.name === "MulterError") return res.status(400).json({ error: "Upload de recibo inválido." });
    if (err.message?.startsWith("Recibo deve")) return res.status(400).json({ error: err.message });
    if (err.name === "SequelizeUniqueConstraintError") return res.status(409).json({ error: "E-mail já cadastrado." });
    if (err.name === "SequelizeValidationError" || err.name === "SequelizeForeignKeyConstraintError") return res.status(400).json({ error: "Dados inválidos ou referência inexistente." });
    console.error(err);
    return res.status(err.status || 500).json({ error: err.status ? err.message : "Erro interno do servidor." });
});

async function start() {
    await sequelize.authenticate();
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => console.log(`API disponível em http://localhost:${port}`));
}
if (require.main === module) start().catch((err) => { console.error("Não foi possível iniciar a API:", err.message); process.exit(1); });
module.exports = app;
