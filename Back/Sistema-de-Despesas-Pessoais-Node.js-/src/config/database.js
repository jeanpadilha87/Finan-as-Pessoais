require("dotenv").config();
const { Sequelize } = require("sequelize");

const required = ["DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST"];
for (const name of required) if (process.env[name] === undefined || process.env[name] === "") throw new Error(`Variável ${name} não configurada.`);

module.exports = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: "mysql",
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: { charset: "utf8mb4" }
});
