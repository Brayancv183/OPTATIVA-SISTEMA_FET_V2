const { pool } = require('../config/db');

class PrestamoModel {
    // Obtener todos los préstamos con filtros y paginación
    static async findAll(filters = {}, page = 1, limit = 10) {
        let query = `
            SELECT p.*, e.nombre as equipo_nombre, e.codigo as equipo_codigo,
                   u.nombre as prestamista_nombre
            FROM prestamos p
            JOIN equipos e ON p.equipo_id = e.id
            LEFT JOIN usuarios u ON p.usuario_prestamista_id = u.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.estado && filters.estado !== 'todos') {
            query += ' AND p.estado = ?';
            values.push(filters.estado);
        }

        if (filters.search && filters.search !== '') {
            query += ' AND (p.solicitante_nombre LIKE ? OR e.nombre LIKE ? OR p.solicitante_identificacion LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY p.fecha_prestamo DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        values.push(limit, offset);

        const [rows] = await pool.query(query, values);
        return rows;
    }

    static async count(filters = {}) {
        let query = `
            SELECT COUNT(*) as total 
            FROM prestamos p
            JOIN equipos e ON p.equipo_id = e.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.estado && filters.estado !== 'todos') {
            query += ' AND p.estado = ?';
            values.push(filters.estado);
        }

        if (filters.search && filters.search !== '') {
            query += ' AND (p.solicitante_nombre LIKE ? OR e.nombre LIKE ? OR p.solicitante_identificacion LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm);
        }

        const [rows] = await pool.query(query, values);
        return rows[0].total;
    }

    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT p.*, e.nombre as equipo_nombre, e.codigo as equipo_codigo,
                    e.stock_actual, e.valor_unitario,
                    u.nombre as prestamista_nombre
             FROM prestamos p
             JOIN equipos e ON p.equipo_id = e.id
             LEFT JOIN usuarios u ON p.usuario_prestamista_id = u.id
             WHERE p.id = ?`,
            [id]
        );
        return rows[0];
    }

    static async create(prestamoData) {
        const {
            equipo_id,
            solicitante_nombre,
            solicitante_identificacion,
            solicitante_email,
            fecha_prestamo,
            fecha_devolucion_esperada,
            condicion_entrega,
            usuario_prestamista_id
        } = prestamoData;

        const [result] = await pool.query(
            `INSERT INTO prestamos 
            (equipo_id, solicitante_nombre, solicitante_identificacion, solicitante_email,
             fecha_prestamo, fecha_devolucion_esperada, condicion_entrega, usuario_prestamista_id, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activo')`,
            [equipo_id, solicitante_nombre, solicitante_identificacion, solicitante_email,
             fecha_prestamo, fecha_devolucion_esperada, condicion_entrega, usuario_prestamista_id]
        );
        return result.insertId;
    }

    static async returnLoan(id, fecha_devolucion_real, condicion_recibido) {
        const [result] = await pool.query(
            `UPDATE prestamos 
             SET fecha_devolucion_real = ?, condicion_recibido = ?, estado = 'Devuelto'
             WHERE id = ? AND estado IN ('Activo', 'Vencido')`,
            [fecha_devolucion_real, condicion_recibido, id]
        );
        return result.affectedRows > 0;
    }

    static async updateExpiredLoans() {
        const [result] = await pool.query(
            `UPDATE prestamos 
             SET estado = 'Vencido' 
             WHERE estado = 'Activo' AND fecha_devolucion_esperada < CURDATE()`
        );
        return result.affectedRows;
    }

    static async getStats() {
        const [activos] = await pool.query("SELECT COUNT(*) as total FROM prestamos WHERE estado = 'Activo'");
        const [vencidos] = await pool.query("SELECT COUNT(*) as total FROM prestamos WHERE estado = 'Vencido'");
        const [total] = await pool.query("SELECT COUNT(*) as total FROM prestamos");
        const [devueltosMes] = await pool.query(
            "SELECT COUNT(*) as total FROM prestamos WHERE estado = 'Devuelto' AND MONTH(fecha_devolucion_real) = MONTH(CURDATE()) AND YEAR(fecha_devolucion_real) = YEAR(CURDATE())"
        );
        return {
            prestamosActivos: activos[0].total,
            prestamosVencidos: vencidos[0].total,
            totalPrestamos: total[0].total,
            devueltosMes: devueltosMes[0].total
        };
    }
}

module.exports = PrestamoModel;