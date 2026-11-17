const { Op } = require("sequelize");
const { Expense, Category, User } = require("../models");
const { validateReceipt, receiptDir } = require("../middleware/upload");
const path = require("path");
const fs = require("fs");
const { parsePermissions } = require("../utils/permissions");

async function readableIds(user) {
    const ids = [];
    const account = await User.findByPk(user.id, { attributes: ["id", "accountType", "permissions"] });
    if (!account) return ids;
    if (account.accountType === "child" && !parsePermissions(account.permissions).some((permission) => ["view_dashboard", "manage_transactions"].includes(permission))) return ids;
    ids.push(user.id);
    if (user.accountType === "parent") {
        const children = await User.findAll({ where: { parentId: user.id }, attributes: ["id", "permissions"] });
        children.filter((child) => parsePermissions(child.permissions).includes("view_dashboard")).forEach((child) => ids.push(child.id));
    }
    return ids;
}
async function writableIds(user) {
    const ids = [];
    const account = await User.findByPk(user.id, { attributes: ["id", "accountType", "permissions"] });
    if (!account) return ids;
    if (account.accountType === "child" && !parsePermissions(account.permissions).includes("manage_transactions")) return ids;
    ids.push(user.id);
    if (user.accountType === "parent") {
        const children = await User.findAll({ where: { parentId: user.id }, attributes: ["id", "permissions"] });
        children.filter((child) => parsePermissions(child.permissions).includes("manage_transactions")).forEach((child) => ids.push(child.id));
    }
    return ids;
}
function validId(value) { return Number.isInteger(Number(value)) && Number(value) > 0; }
function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function safeFilter(query, where) {
    const { status, categoryId, startDate, endDate, minAmount, maxAmount, type } = query;
    if (status && !["PENDENTE", "PAGA"].includes(status)) throw Object.assign(new Error("Status inválido."), { status: 400 });
    if (type && !["expense", "income"].includes(type)) throw Object.assign(new Error("Tipo de lançamento inválido."), { status: 400 });
    if (status) where.status = status;
    if (type) where.type = type;
    if (categoryId) { if (!validId(categoryId)) throw Object.assign(new Error("Categoria inválida."), { status: 400 }); where.categoryId = Number(categoryId); }
    if (startDate || endDate) {
        if ((startDate && !validDate(startDate)) || (endDate && !validDate(endDate)) || (startDate && endDate && startDate > endDate)) throw Object.assign(new Error("Período inválido."), { status: 400 });
        where.date = { ...(startDate ? { [Op.gte]: startDate } : {}), ...(endDate ? { [Op.lte]: endDate } : {}) };
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
        const min = Number(minAmount), max = Number(maxAmount);
        if ((minAmount !== undefined && (!Number.isFinite(min) || min < 0)) || (maxAmount !== undefined && (!Number.isFinite(max) || max < 0)) || (minAmount !== undefined && maxAmount !== undefined && min > max)) throw Object.assign(new Error("Faixa de valores inválida."), { status: 400 });
        where.amount = { ...(minAmount !== undefined ? { [Op.gte]: min } : {}), ...(maxAmount !== undefined ? { [Op.lte]: max } : {}) };
    }
}
async function getAllExpenses(req, res, next) {
    try {
        const where = { userId: { [Op.in]: await readableIds(req.user) } };
        safeFilter(req.query, where);
        const rows = await Expense.findAll({ where, include: [{ model: Category, attributes: ["id", "name"] }, { model: User, as: "owner", attributes: ["id", "name"] }], order: [["date", "DESC"], ["id", "DESC"]], limit: 500 });
        return res.json(rows);
    } catch (err) { return next(err); }
}
async function getSummary(req, res, next) {
    try {
        const where = { userId: { [Op.in]: await readableIds(req.user) } };
        safeFilter(req.query, where);
        const rows = await Expense.findAll({ where, attributes: ["type", "amount", "categoryId"], include: [{ model: Category, attributes: ["name"] }] });
        const totals = { income: 0, expense: 0, count: rows.length, byCategory: {}, incomeByCategory: {}, expenseByCategory: {} };
        for (const row of rows) {
            const amount = Number(row.amount);
            totals[row.type] += amount;
            const label = row.category?.name || "Sem categoria";
            totals.byCategory[label] = (totals.byCategory[label] || 0) + amount;
            const categoryTotals = row.type === "income" ? totals.incomeByCategory : totals.expenseByCategory;
            categoryTotals[label] = (categoryTotals[label] || 0) + amount;
        }
        totals.balance = totals.income - totals.expense;
        totals.incomeByCategory = Object.entries(totals.incomeByCategory).map(([name, total]) => ({ name, total }));
        totals.expenseByCategory = Object.entries(totals.expenseByCategory).map(([name, total]) => ({ name, total }));
        return res.json(totals);
    } catch (err) { return next(err); }
}
async function getExpenseById(req, res, next) {
    try {
        if (!validId(req.params.id)) return res.status(400).json({ error: "ID inválido." });
        const row = await Expense.findOne({ where: { id: req.params.id, userId: { [Op.in]: await readableIds(req.user) } }, include: [Category, { model: User, as: "owner", attributes: ["id", "name"] }] });
        return row ? res.json(row) : res.status(404).json({ error: "Lançamento não encontrado." });
    } catch (err) { return next(err); }
}
async function createExpense(req, res, next) {
    let keepReceipt = false;
    try {
        if (!(await writableIds(req.user)).includes(req.user.id)) return res.status(403).json({ error: "Seu responsável não liberou o gerenciamento de lançamentos." });
        const { description, amount, date, status = "PAGA", categoryId, type = "expense" } = req.body;
        const numericAmount = Number(amount);
        if (typeof description !== "string" || !description.trim() || description.length > 200 || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 9999999999 || !validDate(date) || !validId(categoryId) || !["expense", "income"].includes(type) || !["PENDENTE", "PAGA"].includes(status)) return res.status(400).json({ error: "Dados do lançamento inválidos." });
        const category = await Category.findOne({ where: { id: categoryId, [Op.or]: [{ ownerUserId: null }, { ownerUserId: req.user.id }] } });
        if (!category || (category.type !== "both" && category.type !== type)) return res.status(400).json({ error: "Categoria incompatível com o tipo de lançamento." });
        let receiptPathValue = null;
        if (req.file) {
            const receiptCount = await Expense.count({ where: { userId: req.user.id, receiptPath: { [Op.ne]: null } } });
            if (receiptCount >= 100) return res.status(409).json({ error: "Limite de 100 recibos por conta atingido." });
            if (!validateReceipt(req.file)) return res.status(400).json({ error: "Arquivo inválido ou conteúdo incompatível com o tipo informado." });
            receiptPathValue = req.file.filename;
        }
        const row = await Expense.create({ description: description.trim(), amount: numericAmount, date, status, categoryId: Number(categoryId), type, userId: req.user.id, receiptPath: receiptPathValue });
        keepReceipt = Boolean(req.file);
        return res.status(201).json(row);
    } catch (err) { return next(err); }
    finally { if (!keepReceipt && req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); }
}
async function updateExpense(req, res, next) {
    let oldReceiptToRemove = null;
    let keepReceipt = false;
    try {
        if (!validId(req.params.id)) return res.status(400).json({ error: "ID inválido." });
        const row = await Expense.findOne({ where: { id: req.params.id, userId: { [Op.in]: await writableIds(req.user) } } });
        if (!row) return res.status(404).json({ error: "Lançamento não encontrado ou sem permissão." });
        const { description, amount, date, status, categoryId, type } = req.body;
        const data = {};
        if (description !== undefined) { if (typeof description !== "string" || !description.trim() || description.length > 200) return res.status(400).json({ error: "Descrição inválida." }); data.description = description.trim(); }
        if (amount !== undefined) { const n = Number(amount); if (!Number.isFinite(n) || n <= 0 || n > 9999999999) return res.status(400).json({ error: "Valor inválido." }); data.amount = n; }
        if (date !== undefined) { if (!validDate(date)) return res.status(400).json({ error: "Data inválida." }); data.date = date; }
        if (status !== undefined) { if (!["PENDENTE", "PAGA"].includes(status)) return res.status(400).json({ error: "Status inválido." }); data.status = status; }
        if (type !== undefined) { if (!["expense", "income"].includes(type)) return res.status(400).json({ error: "Tipo inválido." }); data.type = type; }
        if (categoryId !== undefined) { if (!validId(categoryId)) return res.status(400).json({ error: "Categoria inválida." }); data.categoryId = Number(categoryId); }
        const category = await Category.findOne({ where: { id: data.categoryId || row.categoryId, [Op.or]: [{ ownerUserId: null }, { ownerUserId: req.user.id }] } });
        if (!category || (category.type !== "both" && category.type !== (data.type || row.type))) return res.status(400).json({ error: "Categoria incompatível com o tipo de lançamento." });
        if (req.file) {
            if (!row.receiptPath) {
                const receiptCount = await Expense.count({ where: { userId: row.userId, receiptPath: { [Op.ne]: null } } });
                if (receiptCount >= 100) return res.status(409).json({ error: "Limite de 100 recibos por conta atingido." });
            }
            if (!validateReceipt(req.file)) return res.status(400).json({ error: "Arquivo inválido." });
            if (row.receiptPath) oldReceiptToRemove = path.join(receiptDir, path.basename(row.receiptPath));
            data.receiptPath = req.file.filename;
        }
        await row.update(data);
        keepReceipt = Boolean(req.file);
        if (oldReceiptToRemove && fs.existsSync(oldReceiptToRemove)) fs.unlinkSync(oldReceiptToRemove);
        return res.json(row);
    } catch (err) { return next(err); }
    finally { if (!keepReceipt && req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); }
}
async function deleteExpense(req, res, next) {
    try {
        if (!validId(req.params.id)) return res.status(400).json({ error: "ID inválido." });
        const row = await Expense.findOne({ where: { id: req.params.id, userId: { [Op.in]: await writableIds(req.user) } } });
        if (!row) return res.status(404).json({ error: "Lançamento não encontrado ou sem permissão." });
        const receiptToRemove = row.receiptPath ? path.join(receiptDir, path.basename(row.receiptPath)) : null;
        await row.destroy();
        if (receiptToRemove && fs.existsSync(receiptToRemove)) fs.unlinkSync(receiptToRemove);
        return res.status(204).send();
    } catch (err) { return next(err); }
}
async function downloadReceipt(req, res, next) {
    try {
        if (!validId(req.params.id)) return res.status(400).json({ error: "ID inválido." });
        const row = await Expense.findOne({ where: { id: req.params.id, userId: { [Op.in]: await readableIds(req.user) } } });
        if (!row?.receiptPath) return res.status(404).json({ error: "Recibo não encontrado." });
        const target = path.join(receiptDir, path.basename(row.receiptPath));
        if (!fs.existsSync(target)) return res.status(404).json({ error: "Recibo não encontrado." });
        res.setHeader("Content-Disposition", `attachment; filename="recibo-${row.id}${path.extname(target)}"`);
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.sendFile(target);
    } catch (err) { return next(err); }
}
module.exports = { getAllExpenses, getSummary, getExpenseById, createExpense, updateExpense, deleteExpense, downloadReceipt };
