const { pool } = require('../config/db');
const { generateSolicitudCode } = require('../utils/helpers');

class SolicitudModel {
    // Obtener todas las solicitudes con filtros y paginación
    static async findAll(filters = {}, page = 1, limit = 10) {
        let query = `
            SELECT s.*, u.nombre as aprobador_nombre,
                   (SELECT COUNT(*) FROM detalle_solicitud ds WHERE ds.solicitud_id = s.id) as total_items
            FROM solicitudes s
            LEFT JOIN usuarios u ON s.usuario_aprobador_id = u.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.estado && filters.estado !== '') {
            query += ' AND s.estado = ?';
            values.push(filters.estado);
        }

        if (filters.prioridad && filters.prioridad !== '') {
            query += ' AND s.prioridad = ?';
            values.push(filters.prioridad);
        }

        if (filters.search && filters.search !== '') {
            query += ' AND (s.codigo_solicitud LIKE ? OR s.solicitante_nombre LIKE ? OR s.dependencia LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        values.push(limit, offset);

        const [rows] = await pool.query(query, values);
        return rows;
    }

    // Contar total de solicitudes
    static async count(filters = {}) {
        let query = `
            SELECT COUNT(*) as total 
            FROM solicitudes s
            WHERE 1=1
        `;
        const values = [];

        if (filters.estado && filters.estado !== '') {
            query += ' AND s.estado = ?';
            values.push(filters.estado);
        }

        if (filters.prioridad && filters.prioridad !== '') {
            query += ' AND s.prioridad = ?';
            values.push(filters.prioridad);
        }

        if (filters.search && filters.search !== '') {
            query += ' AND (s.codigo_solicitud LIKE ? OR s.solicitante_nombre LIKE ? OR s.dependencia LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm, searchTerm);
        }

        const [rows] = await pool.query(query, values);
        return rows[0].total;
    }

    // Obtener solicitud por ID con sus detalles
    static async findById(id) {
        const [solicitud] = await pool.query(
            `SELECT s.*, u.nombre as aprobador_nombre
             FROM solicitudes s
             LEFT JOIN usuarios u ON s.usuario_aprobador_id = u.id
             WHERE s.id = ?`,
            [id]
        );
        
        if (solicitud.length === 0) return null;
        
        // Obtener detalles de la solicitud
        const [detalles] = await pool.query(
            `SELECT ds.*, e.nombre as equipo_nombre, e.codigo as equipo_codigo,
                    e.stock_actual, e.valor_unitario
             FROM detalle_solicitud ds
             JOIN equipos e ON ds.equipo_id = e.id
             WHERE ds.solicitud_id = ?`,
            [id]
        );
        
        solicitud[0].detalles = detalles;
        return solicitud[0];
    }

    // Crear nueva solicitud
    static async create(solicitudData, detalles) {
        const {
            solicitante_nombre,
            dependencia,
            fecha_solicitud,
            fecha_necesidad,
            prioridad = 'Media',
            valor_total_estimado
        } = solicitudData;

        const codigo_solicitud = generateSolicitudCode();

        const [result] = await pool.query(
            `INSERT INTO solicitudes 
            (codigo_solicitud, solicitante_nombre, dependencia, fecha_solicitud, 
             fecha_necesidad, prioridad, valor_total_estimado, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente')`,
            [codigo_solicitud, solicitante_nombre, dependencia, fecha_solicitud,
             fecha_necesidad, prioridad, valor_total_estimado]
        );
        
        const solicitudId = result.insertId;
        
        // Insertar detalles
        for (const detalle of detalles) {
            await pool.query(
                `INSERT INTO detalle_solicitud (solicitud_id, equipo_id, cantidad_solicitada)
                 VALUES (?, ?, ?)`,
                [solicitudId, detalle.equipo_id, detalle.cantidad_solicitada]
            );
        }
        
        return solicitudId;
    }

    // Aprobar solicitud
    static async approve(id, usuario_aprobador_id, cantidad_aprobada_por_equipo = {}) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Obtener la solicitud y sus detalles
            const [solicitud] = await connection.query(
                `SELECT * FROM solicitudes WHERE id = ? AND estado = 'Pendiente'`,
                [id]
            );
            
            if (solicitud.length === 0) {
                throw new Error('Solicitud no encontrada o ya procesada');
            }
            
            const sol = solicitud[0];
            
            // Obtener detalles de la solicitud
            const [detalles] = await connection.query(
                `SELECT ds.*, e.nombre as equipo_nombre FROM detalle_solicitud ds
                 JOIN equipos e ON ds.equipo_id = e.id
                 WHERE ds.solicitud_id = ?`,
                [id]
            );
            
            // Actualizar la solicitud
            await connection.query(
                `UPDATE solicitudes 
                 SET estado = 'Aprobada', usuario_aprobador_id = ?, fecha_aprobacion = CURDATE()
                 WHERE id = ? AND estado = 'Pendiente'`,
                [usuario_aprobador_id, id]
            );
            
            // Crear prestamos para cada equipo solicitado
            const today = new Date().toISOString().split('T')[0];
            const returnDate = new Date();
            returnDate.setDate(returnDate.getDate() + 15); // Devolución esperada en 15 días
            const returnDateStr = returnDate.toISOString().split('T')[0];
            
            for (const detalle of detalles) {
                const cantidad_aprobada = cantidad_aprobada_por_equipo[detalle.equipo_id] || detalle.cantidad_solicitada;
                
                // Crear un préstamo por cada cantidad aprobada
                for (let i = 0; i < cantidad_aprobada; i++) {
                    await connection.query(
                        `INSERT INTO prestamos 
                         (equipo_id, solicitud_id, solicitante_nombre, solicitante_email, 
                          fecha_prestamo, fecha_devolucion_esperada, usuario_prestamista_id, estado)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')`,
                        [detalle.equipo_id, id, sol.solicitante_nombre, '', today, returnDateStr, usuario_aprobador_id]
                    );
                }
                
                // Actualizar cantidad aprobada en detalle de solicitud
                await connection.query(
                    `UPDATE detalle_solicitud 
                     SET cantidad_aprobada = ?
                     WHERE solicitud_id = ? AND equipo_id = ?`,
                    [cantidad_aprobada, id, detalle.equipo_id]
                );
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Rechazar solicitud
    static async reject(id, usuario_aprobador_id) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Eliminar préstamos asociados a esta solicitud (si los hay)
            await connection.query(
                `DELETE FROM prestamos WHERE solicitud_id = ?`,
                [id]
            );
            
            // Actualizar solicitud a rechazada
            const [result] = await connection.query(
                `UPDATE solicitudes 
                 SET estado = 'Rechazada', usuario_aprobador_id = ?, fecha_aprobacion = CURDATE()
                 WHERE id = ? AND estado = 'Pendiente'`,
                [usuario_aprobador_id, id]
            );
            
            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Obtener estadísticas
    static async getStats() {
        const [total] = await pool.query("SELECT COUNT(*) as total FROM solicitudes");
        const [pendientes] = await pool.query("SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'Pendiente'");
        const [aprobadas] = await pool.query("SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'Aprobada'");
        const [valorTotal] = await pool.query("SELECT SUM(valor_total_estimado) as total FROM solicitudes WHERE estado = 'Aprobada' AND MONTH(fecha_aprobacion) = MONTH(CURDATE())");
        
        return {
            totalSolicitudes: total[0].total,
            solicitudesPendientes: pendientes[0].total,
            solicitudesAprobadas: aprobadas[0].total,
            valorTotalSolicitudes: valorTotal[0].total || 0
        };
    }
}

module.exports = SolicitudModel;