const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");

const AuthSession = sequelize.define("auth_sessions", {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true }
});

module.exports = AuthSession;
