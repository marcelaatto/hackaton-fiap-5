// Configuração do Sequelize CLI (migrations)
// Lê variáveis de ambiente do .env na raiz do serviço
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'hackaton',
    password: process.env.DB_PASS || 'hackaton',
    database: process.env.DB_NAME || 'hackaton',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
  },
  test: {
    username: process.env.DB_USER || 'hackaton',
    password: process.env.DB_PASS || 'hackaton',
    database: process.env.DB_NAME_TEST || 'hackaton_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
