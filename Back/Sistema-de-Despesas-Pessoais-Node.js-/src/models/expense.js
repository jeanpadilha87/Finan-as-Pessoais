const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");
const Expense = sequelize.define("expenses", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    description: { type: DataTypes.STRING(200), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0.01 } },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM("PENDENTE", "PAGA"), allowNull: false, defaultValue: "PAGA" },
    type: { type: DataTypes.ENUM("expense", "income"), allowNull: false, defaultValue: "expense" },
    receiptPath: { type: DataTypes.STRING(255), allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false }
});
module.exports = Expense;
