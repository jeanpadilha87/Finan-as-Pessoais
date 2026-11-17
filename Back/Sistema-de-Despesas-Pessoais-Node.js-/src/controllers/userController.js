const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { Op } = require("sequelize");
const authConfig = require("../config/auth");
const { User, AuthSession } = require("../models");
const { cookieOptions, createCsrfToken } = require("../middleware/csrf");
const { parsePermissions } = require("../utils/permissions");

const publicUser = (user) => {
    const value = user.toJSON();
    delete value.password;
    if (value.accountType === "child") value.permissions = parsePermissions(value.permissions);
    return value;
};
const validPassword = (password) => typeof password === "string" && password.length >= 10 && Buffer.byteLength(password, "utf8") <= 72;
const validEmail = (email) => typeof email === "string" && email.length <= 254 && /^\S+@\S+\.\S+$/.test(email);

async function createUser(req, res, next) {
    try {
        const { email, password, name } = req.body;
        if (typeof name !== "string" || !name.trim() || name.trim().length > 100 || !validEmail(email) || !validPassword(password)) {
            return res.status(400).json({ error: "Informe nome, e-mail válido e senha com pelo menos 10 caracteres." });
        }
        const user = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password: await bcrypt.hash(password, 12), accountType: "parent" });
        return res.status(201).json({ user: publicUser(user) });
    } catch (err) { return next(err); }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        if (!validEmail(email) || typeof password !== "string" || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ error: "Credenciais inválidas." });
        const user = await User.unscoped().findOne({ where: { email: email.trim().toLowerCase() } });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "E-mail ou senha inválidos." });

        const now = new Date();
        await AuthSession.destroy({ where: { [Op.or]: [{ expiresAt: { [Op.lt]: now } }, { revokedAt: { [Op.lt]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } }] } });
        const sessionId = crypto.randomUUID();
        const token = jwt.sign({ id: user.id, email: user.email, accountType: user.accountType, jti: sessionId }, authConfig.jwt.secret, { expiresIn: authConfig.jwt.expiresIn, algorithm: "HS256" });
        const claims = jwt.decode(token);
        await AuthSession.create({ id: sessionId, userId: user.id, expiresAt: new Date(claims.exp * 1000), revokedAt: null });
        const maxAge = Math.max(1, claims.exp - Math.floor(Date.now() / 1000));
        res.setHeader("Set-Cookie", [
            `session=${token}; HttpOnly; ${cookieOptions}; Max-Age=${maxAge}`,
            `csrf=${createCsrfToken()}; ${cookieOptions}`
        ]);
        return res.json({ user: publicUser(user) });
    } catch (err) { return next(err); }
}

async function logout(req, res, next) {
    try {
        await AuthSession.update({ revokedAt: new Date() }, { where: { id: req.sessionId, revokedAt: null } });
        res.setHeader("Set-Cookie", [`session=; HttpOnly; ${cookieOptions}; Max-Age=0`, `csrf=; ${cookieOptions}; Max-Age=0`]);
        return res.status(204).send();
    } catch (err) { return next(err); }
}

async function me(req, res) {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(401).json({ error: "Sessão inválida." });
    return res.json({ user: publicUser(user) });
}

async function listChildren(req, res, next) {
    try {
        if (req.user.accountType !== "parent") return res.status(403).json({ error: "Somente responsáveis podem gerenciar contas vinculadas." });
        const children = await User.findAll({ where: { parentId: req.user.id }, order: [["name", "ASC"]] });
        return res.json(children.map(publicUser));
    } catch (err) { return next(err); }
}

async function createChild(req, res, next) {
    try {
        const { name, email, password, permissions = [] } = req.body;
        const allowed = ["view_dashboard", "manage_transactions"];
        if (req.user.accountType !== "parent") return res.status(403).json({ error: "Somente responsáveis podem criar contas vinculadas." });
        if (typeof name !== "string" || !name.trim() || name.trim().length > 100 || !validEmail(email) || !validPassword(password) || !Array.isArray(permissions) || permissions.some((p) => !allowed.includes(p))) return res.status(400).json({ error: "Dados da conta inválidos." });
        const child = await User.create({ name: name.trim(), email: email.trim().toLowerCase(), password: await bcrypt.hash(password, 12), accountType: "child", parentId: req.user.id, permissions });
        return res.status(201).json({ user: publicUser(child) });
    } catch (err) { return next(err); }
}

async function updateChildPermissions(req, res, next) {
    try {
        if (req.user.accountType !== "parent") return res.status(403).json({ error: "Ação permitida somente ao responsável." });
        const child = await User.findOne({ where: { id: req.params.id, parentId: req.user.id } });
        const allowed = ["view_dashboard", "manage_transactions"];
        if (!child) return res.status(404).json({ error: "Conta vinculada não encontrada." });
        const permissions = req.body.permissions;
        if (!Array.isArray(permissions) || permissions.some((p) => !allowed.includes(p)) || new Set(permissions).size !== permissions.length) return res.status(400).json({ error: "Permissões inválidas." });
        await child.update({ permissions });
        return res.json({ user: publicUser(child) });
    } catch (err) { return next(err); }
}

module.exports = { createUser, login, logout, me, listChildren, createChild, updateChildPermissions };
