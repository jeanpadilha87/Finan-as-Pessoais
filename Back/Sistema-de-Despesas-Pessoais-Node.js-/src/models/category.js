const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");
const Category = sequelize.define("categories", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    type: { type: DataTypes.ENUM("expense", "income", "both"), allowNull: false, defaultValue: "both" },
    ownerUserId: { type: DataTypes.INTEGER, allowNull: true }
});
module.exports = Category;
