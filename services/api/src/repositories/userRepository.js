const { User } = require('../database');

async function findByEmail(email) {
  return User.findOne({ where: { email } });
}

async function create(data) {
  return User.create(data);
}

async function findById(id) {
  return User.findByPk(id);
}

module.exports = { findByEmail, create, findById };
