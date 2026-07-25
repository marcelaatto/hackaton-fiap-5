const { DataTypes } = require('sequelize');

const VIDEO_STATUSES = ['UPLOADED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'];

module.exports = (sequelize) => {
  const Video = sequelize.define(
    'Video',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      original_filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      s3_key: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      zip_s3_key: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...VIDEO_STATUSES),
        defaultValue: 'UPLOADED',
        allowNull: false,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'videos',
      underscored: true,
      timestamps: true,
    }
  );

  return Video;
};

module.exports.VIDEO_STATUSES = VIDEO_STATUSES;
