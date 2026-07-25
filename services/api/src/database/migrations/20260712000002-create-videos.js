/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('videos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      s3_key: {
        type: Sequelize.STRING(512),
        allowNull: false,
      },
      zip_s3_key: {
        type: Sequelize.STRING(512),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('UPLOADED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'),
        defaultValue: 'UPLOADED',
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('videos', ['user_id']);
    await queryInterface.addIndex('videos', ['status']);
    await queryInterface.addIndex('videos', ['user_id', 'status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('videos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_videos_status";');
  },
};
