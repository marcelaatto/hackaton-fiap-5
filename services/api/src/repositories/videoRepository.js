const { Op } = require('sequelize');
const { Video } = require('../database');

async function create(data) {
  return Video.create(data);
}

async function findById(id) {
  return Video.findByPk(id);
}

async function findByUserAndId(userId, id) {
  return Video.findOne({ where: { id, user_id: userId } });
}

async function findAllByUser(userId) {
  return Video.findAll({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
  });
}

async function updateStatus(id, status, extra = {}) {
  const [, rows] = await Video.update(
    { status, ...extra },
    { where: { id }, returning: true }
  );
  return rows[0];
}

async function countActiveByUser(userId) {
  return Video.count({
    where: {
      user_id: userId,
      status: { [Op.in]: ['QUEUED', 'PROCESSING'] },
    },
  });
}

module.exports = {
  create,
  findById,
  findByUserAndId,
  findAllByUser,
  updateStatus,
  countActiveByUser,
};
