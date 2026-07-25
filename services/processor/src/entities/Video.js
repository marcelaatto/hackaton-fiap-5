const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define(
    'Video',
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false },
      s3_key: { type: DataTypes.STRING(512), allowNull: false },
      zip_s3_key: { type: DataTypes.STRING(512), allowNull: true },
      status: {
        type: DataTypes.ENUM('UPLOADED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'),
        allowNull: false,
      },
      error_message: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'videos', underscored: true, timestamps: true }
  );
};
