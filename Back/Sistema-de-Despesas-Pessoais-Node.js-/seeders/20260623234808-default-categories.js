'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('categories', [
      { name: 'Alimentação', description: 'Gastos com alimentação', type: 'expense', ownerUserId: null, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Transporte', description: 'Gastos com transporte', type: 'expense', ownerUserId: null, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Lazer', description: 'Gastos com lazer', type: 'expense', ownerUserId: null, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Salário', description: 'Receitas de salário', type: 'income', ownerUserId: null, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Outras receitas', description: 'Outras entradas financeiras', type: 'income', ownerUserId: null, createdAt: new Date(), updatedAt: new Date() }
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('categories', { ownerUserId: null }, {});
  }
};
