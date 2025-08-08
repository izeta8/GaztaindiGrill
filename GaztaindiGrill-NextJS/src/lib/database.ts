import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4'
};

let connection: mysql.Connection | null = null;

export async function getConnection(): Promise<mysql.Connection> {
  if (!connection) {
    try {
      connection = await mysql.createConnection(dbConfig);
      console.log('Conexión a MySQL establecida');
    } catch (error) {
      console.error('Error conectando a MySQL:', error);
      throw error;
    }
  }
  return connection;
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.end();
    connection = null;
    console.log('Conexión a MySQL cerrada');
  }
}
