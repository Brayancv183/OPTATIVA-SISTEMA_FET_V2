const { pool } = require('../config/db');

class UsuarioModel {
    static async create(usuarioData) { /* igual */ }
    
    static async findByEmail(email) { /* igual */ }
    
    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, nombre, email, rol, telefono, area_departamento, avatar_iniciales, avatar_url, ultimo_login FROM usuarios WHERE id = ? AND activo = TRUE',
            [id]
        );
        return rows[0];
    }
    
    static async updateLastLogin(id) { /* igual */ }
    
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
    
    static async updatePassword(id, newPasswordHash) { /* igual */ }
}

module.exports = UsuarioModel;