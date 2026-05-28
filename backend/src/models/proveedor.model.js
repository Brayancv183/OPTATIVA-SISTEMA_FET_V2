const { pool } = require('../config/db');

class ProveedorModel {
    // Obtener todos los proveedores (con paginación opcional)
    static async findAll(filters = {}) {
        let query = 'SELECT * FROM proveedores WHERE activo = TRUE';
        const values = [];

        if (filters.search) {
            query += ' AND (nombre LIKE ? OR contacto_nombre LIKE ? OR email LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY nombre ASC';
        
        const [rows] = await pool.query(query, values);
        return rows;
    }

    // Encontrar proveedor por ID
    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM proveedores WHERE id = ? AND activo = TRUE',
            [id]
        );
        return rows[0];
    }

    // Crear nuevo proveedor
    static async create(proveedorData) {
        const { nombre, contacto_nombre, telefono, email, direccion } = proveedorData;
        const [result] = await pool.query(
            `INSERT INTO proveedores (nombre, contacto_nombre, telefono, email, direccion, activo) 
             VALUES (?, ?, ?, ?, ?, TRUE)`,
            [nombre, contacto_nombre || null, telefono || null, email || null, direccion || null]
        );
        return result.insertId;
    }

    // Actualizar proveedor
    static async update(id, proveedorData) {
        const { nombre, contacto_nombre, telefono, email, direccion } = proveedorData;
        const [result] = await pool.query(
            `UPDATE proveedores SET 
                nombre = ?, contacto_nombre = ?, telefono = ?, email = ?, direccion = ?
             WHERE id = ? AND activo = TRUE`,
            [nombre, contacto_nombre, telefono, email, direccion, id]
        );
        return result.affectedRows > 0;
    }

    // Eliminar proveedor (soft delete)
    static async delete(id) {
        const [result] = await pool.query(
            'UPDATE proveedores SET activo = FALSE WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    // Obtener estadísticas para la página de proveedores
    static async getStats() {
        const [total] = await pool.query('SELECT COUNT(*) as total FROM proveedores WHERE activo = TRUE');
        const [activos] = await pool.query('SELECT COUNT(*) as activos FROM proveedores WHERE activo = TRUE');
        const [compras] = await pool.query(`
            SELECT SUM(f.total) as total_compras 
            FROM facturas f 
            WHERE f.estado = 'Validada'
        `);
        const [ordenes] = await pool.query(`
            SELECT COUNT(*) as ordenes 
            FROM facturas 
            WHERE estado = 'Pendiente'
        `);
        
        return {
            totalProveedores: total[0].total,
            proveedoresActivos: activos[0].activos,
            comprasTotales: compras[0].total_compras || 0,
            ordenesActivas: ordenes[0].ordenes || 0
        };
    }
}

module.exports = ProveedorModel;