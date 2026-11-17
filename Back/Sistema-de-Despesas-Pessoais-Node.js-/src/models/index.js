const User = require("./user");
const Expense = require("./expense");
const Category = require("./category");
const AuthSession = require("./authSession");

User.hasMany(Expense, { foreignKey: "userId", as: "transactions" });
Expense.belongsTo(User, { foreignKey: "userId", as: "owner" });
Category.hasMany(Expense, { foreignKey: "categoryId" });
Expense.belongsTo(Category, { foreignKey: "categoryId" });
User.hasMany(User, { foreignKey: "parentId", as: "children" });
User.belongsTo(User, { foreignKey: "parentId", as: "parent" });
User.hasMany(AuthSession, { foreignKey: "userId", as: "sessions" });
AuthSession.belongsTo(User, { foreignKey: "userId" });

module.exports = { User, Expense, Category, AuthSession };
