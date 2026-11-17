const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const categories = require("../controllers/categoryController");

router.use("/categories", auth);
router.get("/categories", categories.getAllCategories);
router.get("/categories/:id", categories.getCategoryById);
router.post("/categories", categories.createCategory);
router.put("/categories/:id", categories.updateCategory);
router.delete("/categories/:id", categories.deleteCategory);
module.exports = router;
