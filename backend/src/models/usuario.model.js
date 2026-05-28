const { pool } = require('../config/db');

class UsuarioModel {
    static async create(usuarioData) {
        const { nombre, email, password_hash, rol, telefono, area_departamento, avatar_iniciales } = usuarioData;
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, area_departamento, avatar_iniciales) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, email, password_hash, rol, telefono, area_departamento, avatar_iniciales]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        console.log('    Query SQL: SELECT * FROM usuarios WHERE email = ? AND activo = TRUE');
        console.log('    Buscando email:', email);
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND activo = TRUE', [email]);
        console.log('    Resultados encontrados:', rows.length);
        if (rows.length > 0) {
            console.log('    Usuario encontrado en BD:', rows[0].nombre);
            console.log('    Hash almacenado:', rows[0].password_hash);
        } else {
            console.log('    No se encontró usuario con ese email');
        }
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, nombre, email, rol, telefono, area_departamento, avatar_iniciales, avatar_url, ultimo_login FROM usuarios WHERE id = ? AND activo = TRUE',
            [id]
        );
        return rows[0];
    }

    static async updateLastLogin(id) {
        await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [id]);
    }

    static async getProfileStats(id) {
        const [userData] = await pool.query(
            'SELECT id, nombre, email, rol, telefono, area_departamento, avatar_iniciales, avatar_url, ultimo_login FROM usuarios WHERE id = ?',
            [id]
        );
        if (userData.length === 0) return null;
        const [prestamos] = await pool.query(
            'SELECT COUNT(*) as total FROM prestamos WHERE usuario_prestamista_id = ?',
            [id]
        );
        const [antiguedad] = await pool.query(
            'SELECT DATEDIFF(NOW(), MIN(created_at)) / 365 as años FROM usuarios WHERE id = ?',
            [id]
        );
        const user = userData[0];
        user.prestamos_gestionados = prestamos[0].total;
        user.anos_experiencia = Math.floor(antiguedad[0].años || 0);
        user.satisfaccion = 98;
        return user;
    }

    static async updateProfile(id, data) {
        const { nombre, telefono, area_departamento } = data;
        const [result] = await pool.query(
            'UPDATE usuarios SET nombre = ?, telefono = ?, area_departamento = ? WHERE id = ?',
            [nombre, telefono, area_departamento, id]
        );
        return result.affectedRows > 0;
    }

    static async updateAvatar(id, avatar_url) {
        const [result] = await pool.query(
            'UPDATE usuarios SET avatar_url = ? WHERE id = ?',
            [avatar_url, id]
        );
        return result.affectedRows > 0;
    }

    static async updatePassword(id, newPasswordHash) {
        const [result] = await pool.query(
            'UPDATE usuarios SET password_hash = ? WHERE id = ?',
            [newPasswordHash, id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = UsuarioModel;