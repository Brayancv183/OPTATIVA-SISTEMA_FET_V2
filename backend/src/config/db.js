// src/config/db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Crear el pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Promisify para usar async/await
const promisePool = pool.promise();

// Función de prueba de conexión
const testConnection = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log(' Base de datos MySQL conectada exitosamente.');
        connection.release(); // Liberar la conexión de vuelta al pool
        return true;
    } catch (error) {
        console.error(' Error al conectar a la base de datos MySQL:', error.message);
        return false;
    }
};

module.exports = { pool: promisePool, testConnection };