const { Op } = require("sequelize");
const { Category } = require("../models");
const { User } = require("../models");
const { parsePermissions } = require("../utils/permissions");
const validTypes = ["income", "expense", "both"];
async function permission(req, res, write = false) {
    if (req.user.accountType !== "child") return true;
    const user = await User.findByPk(req.user.id, { attributes: ["permissions"] });
    const permissions = parsePermissions(user?.permissions);
    const allowed = write ? permissions.includes("manage_transactions") : permissions.some((p) => ["view_dashboard", "manage_transactions"].includes(p));
    if (!allowed) res.status(403).json({ error: "Seu responsável não liberou o acesso às categorias." });
    return Boolean(allowed);
}
async function getAllCategories(req, res, next) {
    try { if (!(await permission(req, res))) return; return res.json(await Category.findAll({ where: { [Op.or]: [{ ownerUserId: null }, { ownerUserId: req.user.id }] }, order: [["name", "ASC"]] })); }
    catch (err) { return next(err); }
}
async function getCategoryById(req, res, next) {
    try {
        if (!(await permission(req, res))) return;
        const row = await Category.findOne({ where: { id: req.params.id, [Op.or]: [{ ownerUserId: null }, { ownerUserId: req.user.id }] } });
        return row ? res.json(row) : res.status(404).json({ error: "Categoria não encontrada." });
    } catch (err) { return next(err); }
}
async function createCategory(req, res, next) {
    try {
        if (!(await permission(req, res, true))) return;
        const { name, description = null, type = "both" } = req.body;
        if (typeof name !== "string" || !name.trim() || name.length > 80 || (description !== null && (typeof description !== "string" || description.length > 255)) || !validTypes.includes(type)) return res.status(400).json({ error: "Dados da categoria inválidos." });
        return res.status(201).json(await Category.create({ name: name.trim(), description, type, ownerUserId: req.user.id }));
    } catch (err) { return next(err); }
}
async function updateCategory(req, res, next) {
    try {
        if (!(await permission(req, res, true))) return;
        const row = await Category.findOne({ where: { id: req.params.id, ownerUserId: req.user.id } });
        if (!row) return res.status(404).json({ error: "Categoria não encontrada." });
        const { name, description, type } = req.body;
        if (name !== undefined) { if (typeof name !== "string" || !name.trim() || name.length > 80) return res.status(400).json({ error: "Nome inválido." }); row.name = name.trim(); }
        if (description !== undefined) { if (typeof description !== "string" || description.length > 255) return res.status(400).json({ error: "Descrição inválida." }); row.description = description; }
        if (type !== undefined) { if (!validTypes.includes(type)) return res.status(400).json({ error: "Tipo inválido." }); row.type = type; }
        await row.save(); return res.json(row);
    } catch (err) { return next(err); }
}
async function deleteCategory(req, res, next) {
    try {
        if (!(await permission(req, res, true))) return;
        const row = await Category.findOne({ where: { id: req.params.id, ownerUserId: req.user.id } });
        if (!row) return res.status(404).json({ error: "Categoria não encontrada ou protegida." });
        if (await row.countExpenses()) return res.status(409).json({ error: "Categoria vinculada a lançamentos não pode ser removida." });
        await row.destroy(); return res.status(204).send();
    } catch (err) { return next(err); }
}
module.exports = { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
