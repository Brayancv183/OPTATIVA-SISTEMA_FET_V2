const { pool } = require('../config/db');

class EquipoModel {
    // Obtener todos los equipos con filtros
    static async findAll(filters = {}) {
        let query = `
            SELECT e.*, p.nombre as proveedor_nombre 
            FROM equipos e
            LEFT JOIN proveedores p ON e.proveedor_id = p.id
            WHERE e.activo = TRUE
        `;
        const values = [];

        if (filters.categoria && filters.categoria !== '') {
            query += ' AND e.categoria = ?';
            values.push(filters.categoria);
        }

        if (filters.estado && filters.estado !== '') {
            if (filters.estado === 'Bajo Stock') {
                query += ' AND e.stock_actual <= e.stock_minimo';
            } else if (filters.estado === 'Activo') {
                query += ' AND e.stock_actual > e.stock_minimo';
            }
        }

        if (filters.search && filters.search !== '') {
            query += ' AND (e.nombre LIKE ? OR e.codigo LIKE ? OR e.categoria LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY e.nombre ASC';
        
        const [rows] = await pool.query(query, values);
        return rows;
    }

    // Encontrar equipo por ID
    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT * FROM equipos WHERE id = ? AND activo = TRUE',
            [id]
        );
        return rows[0];
    }

    // Encontrar equipo por código
    static async findByCode(codigo) {
        const [rows] = await pool.query(
            'SELECT * FROM equipos WHERE codigo = ? AND activo = TRUE',
            [codigo]
        );
        return rows[0];
    }

    // Crear nuevo equipo
    static async create(equipoData) {
        const {
            codigo, nombre, descripcion, categoria, stock_actual,
            stock_minimo, valor_unitario, iva, proveedor_id,
            ubicacion, unidad_medida
        } = equipoData;

        const [result] = await pool.query(
            `INSERT INTO equipos (codigo, nombre, descripcion, categoria, stock_actual, 
             stock_minimo, valor_unitario, iva, proveedor_id, ubicacion, unidad_medida)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [codigo, nombre, descripcion, categoria, stock_actual || 0,
             stock_minimo, valor_unitario, iva || 19, proveedor_id || null,
             ubicacion, unidad_medida || 'Unidad']
        );
        return result.insertId;
    }

    // Actualizar equipo
    static async update(id, equipoData) {
        const {
            nombre, descripcion, categoria, stock_actual,
            stock_minimo, valor_unitario, iva, proveedor_id,
            ubicacion, unidad_medida
        } = equipoData;

        const [result] = await pool.query(
            `UPDATE equipos SET 
                nombre = ?, descripcion = ?, categoria = ?, stock_actual = ?,
                stock_minimo = ?, valor_unitario = ?, iva = ?, proveedor_id = ?,
                ubicacion = ?, unidad_medida = ?
             WHERE id = ? AND activo = TRUE`,
            [nombre, descripcion, categoria, stock_actual, stock_minimo,
             valor_unitario, iva, proveedor_id, ubicacion, unidad_medida, id]
        );
        return result.affectedRows > 0;
    }

    // Actualizar stock (incrementar o decrementar)
    static async updateStock(id, cantidad, tipo) {
        const operator = tipo === 'Entrada' ? '+' : '-';
        const [result] = await pool.query(
            `UPDATE equipos SET stock_actual = stock_actual ${operator} ? WHERE id = ? AND activo = TRUE`,
            [Math.abs(cantidad), id]
        );
        return result.affectedRows > 0;
    }

    // Eliminar equipo (soft delete)
    static async delete(id) {
        const [result] = await pool.query(
            'UPDATE equipos SET activo = FALSE WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    // Obtener equipos con bajo stock (para alertas)
    static async getLowStockEquipos() {
        const [rows] = await pool.query(
            `SELECT e.*, p.nombre as proveedor_nombre,
             CASE 
                WHEN e.stock_actual <= (e.stock_minimo / 2) THEN 'Crítica'
                WHEN e.stock_actual <= e.stock_minimo THEN 'Alta'
                WHEN e.stock_actual <= e.stock_minimo * 1.5 THEN 'Media'
                ELSE 'Baja'
             END as prioridad
             FROM equipos e
             LEFT JOIN proveedores p ON e.proveedor_id = p.id
             WHERE e.activo = TRUE AND e.stock_actual <= e.stock_minimo * 1.5
             ORDER BY prioridad ASC`
        );
        return rows;
    }

    // Obtener estadísticas para dashboard
    static async getStats() {
        const [totalEquipos] = await pool.query('SELECT COUNT(*) as total FROM equipos WHERE activo = TRUE');
        const [valorInventario] = await pool.query('SELECT SUM(stock_actual * valor_unitario) as total FROM equipos WHERE activo = TRUE');
        const [bajoStock] = await pool.query('SELECT COUNT(*) as total FROM equipos WHERE activo = TRUE AND stock_actual <= stock_minimo');
        
        return {
            totalEquipos: totalEquipos[0].total,
            valorInventario: valorInventario[0].total || 0,
            equiposBajoStock: bajoStock[0].total
        };
    }
}

module.exports = EquipoModel;