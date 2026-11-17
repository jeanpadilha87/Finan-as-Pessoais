const express = require("express");
const router = express.Router();
const users = require("../controllers/userController");
const auth = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Muitas tentativas de login. Aguarde 15 minutos." });
const registrationLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Limite de cadastros atingido. Tente novamente mais tarde." });

router.post("/users", registrationLimit, users.createUser);
router.post("/users/login", loginLimit, users.login);
router.post("/users/logout", auth, users.logout);
router.get("/users/me", auth, users.me);
router.get("/family/children", auth, users.listChildren);
router.post("/family/children", auth, users.createChild);
router.patch("/family/children/:id/permissions", auth, users.updateChildPermissions);
module.exports = router;
