const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");

const User = sequelize.define("users", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    accountType: { type: DataTypes.ENUM("parent", "child"), allowNull: false, defaultValue: "parent" },
    parentId: { type: DataTypes.INTEGER, allowNull: true },
    permissions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] }
}, { defaultScope: { attributes: { exclude: ["password"] } }, scopes: { withPassword: { attributes: {} } } });

module.exports = User;
