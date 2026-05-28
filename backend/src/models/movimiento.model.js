const { pool } = require('../config/db');

class MovimientoModel {
    // Crear un nuevo movimiento
    static async create(movimientoData) {
        const {
            tipo,
            equipo_id,
            cantidad,
            valor_unitario_momento,
            usuario_id,
            origen_destino,
            factura_id = null,
            prestamo_id = null,
            estado = 'Completada',
            notas = null
        } = movimientoData;

        const [result] = await pool.query(
            `INSERT INTO movimientos 
            (tipo, equipo_id, cantidad, valor_unitario_momento, usuario_id, origen_destino, factura_id, prestamo_id, estado, notas) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tipo, equipo_id, cantidad, valor_unitario_momento, usuario_id, origen_destino, factura_id, prestamo_id, estado, notas]
        );
        
        return result.insertId;
    }

    // Obtener movimientos con filtros y paginación
    static async findAll(filters = {}) {
        let query = `
            SELECT m.*, 
                   e.nombre as equipo_nombre, 
                   e.codigo as equipo_codigo,
                   u.nombre as usuario_nombre
            FROM movimientos m
            JOIN equipos e ON m.equipo_id = e.id
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.tipo && filters.tipo !== '') {
            query += ' AND m.tipo = ?';
            values.push(filters.tipo);
        }

        if (filters.estado && filters.estado !== '') {
            query += ' AND m.estado = ?';
            values.push(filters.estado);
        }

        if (filters.search && filters.search !== '') {
            query += ' AND (e.nombre LIKE ? OR e.codigo LIKE ? OR m.origen_destino LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm);
        }

        if (filters.periodo && filters.periodo === '7') {
            query += ' AND m.fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        } else if (filters.periodo && filters.periodo === '30') {
            query += ' AND m.fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        } else if (filters.periodo && filters.periodo === 'mes') {
            query += ' AND MONTH(m.fecha) = MONTH(CURRENT_DATE()) AND YEAR(m.fecha) = YEAR(CURRENT_DATE())';
        }

        query += ' ORDER BY m.fecha DESC';
        
        const [rows] = await pool.query(query, values);
        return rows;
    }

    // Obtener movimiento por ID
    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT m.*, e.nombre as equipo_nombre, e.codigo as equipo_codigo
             FROM movimientos m
             JOIN equipos e ON m.equipo_id = e.id
             WHERE m.id = ?`,
            [id]
        );
        return rows[0];
    }

    // Actualizar estado de movimiento
    static async updateEstado(id, estado) {
        const [result] = await pool.query(
            'UPDATE movimientos SET estado = ? WHERE id = ?',
            [estado, id]
        );
        return result.affectedRows > 0;
    }

    // Obtener estadísticas para la página de movimientos
    static async getStats() {
        // Entradas hoy
        const [entradasHoy] = await pool.query(
            `SELECT COALESCE(SUM(cantidad), 0) as total 
             FROM movimientos 
             WHERE tipo = 'Entrada' AND DATE(fecha) = CURDATE()`
        );
        
        // Salidas hoy
        const [salidasHoy] = await pool.query(
            `SELECT COALESCE(SUM(cantidad), 0) as total 
             FROM movimientos 
             WHERE tipo = 'Salida' AND DATE(fecha) = CURDATE()`
        );
        
        // Valor entradas esta semana
        const [valorEntradas] = await pool.query(
            `SELECT COALESCE(SUM(valor_total), 0) as total 
             FROM movimientos 
             WHERE tipo = 'Entrada' AND fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
        );
        
        // Movimientos pendientes
        const [pendientes] = await pool.query(
            `SELECT COUNT(*) as total 
             FROM movimientos 
             WHERE estado = 'Pendiente'`
        );
        
        return {
            entradasHoy: entradasHoy[0].total,
            salidasHoy: salidasHoy[0].total,
            valorEntradas: valorEntradas[0].total,
            movimientosPendientes: pendientes[0].total
        };
    }

    // Obtener movimientos recientes (para dashboard)
    static async getRecentMovements(limit = 10) {
        const [rows] = await pool.query(
            `SELECT m.*, e.nombre as equipo_nombre, e.codigo as equipo_codigo
             FROM movimientos m
             JOIN equipos e ON m.equipo_id = e.id
             ORDER BY m.fecha DESC
             LIMIT ?`,
            [limit]
        );
        return rows;
    }
}

module.exports = MovimientoModel;