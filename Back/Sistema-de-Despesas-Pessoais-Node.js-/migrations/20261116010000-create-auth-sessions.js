'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auth_sessions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('auth_sessions', ['userId']);
    await queryInterface.addIndex('auth_sessions', ['expiresAt']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('auth_sessions');
  }
};
