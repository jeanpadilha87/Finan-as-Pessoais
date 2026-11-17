'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'accountType', { type: Sequelize.ENUM('parent', 'child'), allowNull: false, defaultValue: 'parent' });
    await queryInterface.addColumn('users', 'parentId', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' });
    await queryInterface.addColumn('users', 'permissions', { type: Sequelize.JSON, allowNull: true });
    await queryInterface.addColumn('categories', 'type', { type: Sequelize.ENUM('expense', 'income', 'both'), allowNull: false, defaultValue: 'both' });
    await queryInterface.addColumn('categories', 'ownerUserId', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    await queryInterface.addColumn('expenses', 'type', { type: Sequelize.ENUM('expense', 'income'), allowNull: false, defaultValue: 'expense' });
    await queryInterface.addColumn('expenses', 'receiptPath', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.changeColumn('expenses', 'amount', { type: Sequelize.DECIMAL(12, 2), allowNull: false });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('expenses', 'receiptPath');
    await queryInterface.removeColumn('expenses', 'type');
    await queryInterface.changeColumn('expenses', 'amount', { type: Sequelize.FLOAT, allowNull: false });
    await queryInterface.removeColumn('categories', 'ownerUserId');
    await queryInterface.removeColumn('categories', 'type');
    await queryInterface.removeColumn('users', 'permissions');
    await queryInterface.removeColumn('users', 'parentId');
    await queryInterface.removeColumn('users', 'accountType');
  }
};
