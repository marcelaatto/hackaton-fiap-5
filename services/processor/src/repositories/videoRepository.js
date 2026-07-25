const { Video } = require('../database');

async function findById(id) {
  return Video.findByPk(id);
}

async function updateStatus(id, status, extra = {}) {
  await Video.update({ status, ...extra }, { where: { id } });
}

module.exports = { findById, updateStatus };
