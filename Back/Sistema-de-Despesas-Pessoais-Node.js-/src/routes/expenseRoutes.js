const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const expenses = require("../controllers/expenseController");

router.use(auth);
router.get("/expenses", expenses.getAllExpenses);
router.get("/expenses/:id/receipt", expenses.downloadReceipt);
router.get("/expenses/:id", expenses.getExpenseById);
router.post("/expenses", upload.single("receipt"), expenses.createExpense);
router.put("/expenses/:id", upload.single("receipt"), expenses.updateExpense);
router.delete("/expenses/:id", expenses.deleteExpense);
router.get("/dashboard/summary", expenses.getSummary);
router.get("/dashboard/total-expenses", (req, res, next) => { req.query.type = "expense"; expenses.getSummary(req, res, next); });
router.get("/dashboard/expenses-count", expenses.getSummary);
router.get("/dashboard/expenses-by-category", expenses.getSummary);
module.exports = router;
