const { pool } = require('../config/db');

class AlertaModel {
    static async createOrUpdate(equipo_id) {
        const [equipo] = await pool.query(
            'SELECT stock_actual, stock_minimo, nombre FROM equipos WHERE id = ?',
            [equipo_id]
        );
        if (equipo.length === 0) return null;

        const stockActual = equipo[0].stock_actual;
        const stockMinimo = equipo[0].stock_minimo;
        
        let prioridad = 'Baja';
        if (stockActual <= 0) prioridad = 'Crítica';
        else if (stockActual <= stockMinimo / 2) prioridad = 'Crítica';
        else if (stockActual <= stockMinimo) prioridad = 'Alta';
        else if (stockActual <= stockMinimo * 1.5) prioridad = 'Media';

        const [existingRows] = await pool.query(
            'SELECT id FROM alertas_stock WHERE equipo_id = ? AND estado = "Activa"',
            [equipo_id]
        );

        if (existingRows.length > 0) {
            const keepId = existingRows[0].id;
            await pool.query(
                'UPDATE alertas_stock SET prioridad = ?, fecha_creacion = NOW() WHERE equipo_id = ? AND estado = "Activa"',
                [prioridad, equipo_id]
            );

            if (existingRows.length > 1) {
                await pool.query(
                    'DELETE FROM alertas_stock WHERE equipo_id = ? AND estado = "Activa" AND id <> ?',
                    [equipo_id, keepId]
                );
            }

            return keepId;
        } else {
            const [result] = await pool.query(
                'INSERT INTO alertas_stock (equipo_id, prioridad, estado) VALUES (?, ?, "Activa")',
                [equipo_id, prioridad]
            );
            return result.insertId;
        }
    }

    static async resolveByEquipo(equipo_id) {
        await pool.query(
            'UPDATE alertas_stock SET estado = "Atendida", fecha_atencion = NOW() WHERE equipo_id = ? AND estado = "Activa"',
            [equipo_id]
        );
        return true;
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT a.*, e.nombre as equipo_nombre, e.codigo as equipo_codigo, 
                   e.stock_actual, e.stock_minimo, e.categoria
            FROM alertas_stock a
            JOIN equipos e ON a.equipo_id = e.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.estado && filters.estado !== '') {
            query += ' AND a.estado = ?';
            values.push(filters.estado);
        }

        if (filters.prioridad && filters.prioridad !== '') {
            query += ' AND a.prioridad = ?';
            values.push(filters.prioridad);
        }

        query += ' ORDER BY FIELD(a.prioridad, "Crítica", "Alta", "Media", "Baja"), a.fecha_creacion DESC';
        
        const [rows] = await pool.query(query, values);
        return rows;
    }

    static async getStats() {
        const [total] = await pool.query('SELECT COUNT(*) as total FROM alertas_stock WHERE estado = "Activa"');
        const [criticas] = await pool.query('SELECT COUNT(*) as total FROM alertas_stock WHERE prioridad = "Crítica" AND estado = "Activa"');
        const [mediaAlta] = await pool.query('SELECT COUNT(*) as total FROM alertas_stock WHERE prioridad IN ("Alta", "Media") AND estado = "Activa"');
        const [atendidas] = await pool.query('SELECT COUNT(*) as total FROM alertas_stock WHERE estado = "Atendida" AND MONTH(fecha_atencion) = MONTH(CURDATE())');
        
        return {
            totalAlertas: total[0].total,
            alertasCriticas: criticas[0].total,
            alertasMediaAlta: mediaAlta[0].total,
            alertasAtendidas: atendidas[0].total
        };
    }

    static async attend(id, atendida_por) {
        const [result] = await pool.query(
            'UPDATE alertas_stock SET estado = "Atendida", atendida_por = ?, fecha_atencion = NOW() WHERE id = ? AND estado = "Activa"',
            [atendida_por, id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = AlertaModel;