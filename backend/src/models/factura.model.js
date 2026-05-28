const { pool } = require('../config/db');

class FacturaModel {
    // Obtener todas las facturas con filtros y paginación
    static async findAll(filters = {}, page = 1, limit = 10) {
        let query = `
            SELECT f.*, p.nombre as proveedor_nombre, prog.nombre as programa_nombre
            FROM facturas f
            JOIN proveedores p ON f.proveedor_id = p.id
            LEFT JOIN programas prog ON f.programa_id = prog.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.search && filters.search !== '') {
            query += ' AND (f.numero_factura LIKE ? OR p.nombre LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm);
        }

        if (filters.estado && filters.estado !== '') {
            query += ' AND f.estado = ?';
            values.push(filters.estado);
        }

        query += ' ORDER BY f.fecha_emision DESC LIMIT ? OFFSET ?';
        const offset = (page - 1) * limit;
        values.push(limit, offset);

        const [rows] = await pool.query(query, values);
        return rows;
    }

    // Contar total de facturas
    static async count(filters = {}) {
        let query = `
            SELECT COUNT(*) as total 
            FROM facturas f
            JOIN proveedores p ON f.proveedor_id = p.id
            WHERE 1=1
        `;
        const values = [];

        if (filters.search && filters.search !== '') {
            query += ' AND (f.numero_factura LIKE ? OR p.nombre LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            values.push(searchTerm, searchTerm);
        }

        if (filters.estado && filters.estado !== '') {
            query += ' AND f.estado = ?';
            values.push(filters.estado);
        }

        const [rows] = await pool.query(query, values);
        return rows[0].total;
    }

    // Obtener factura por ID
    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT f.*, p.nombre as proveedor_nombre, prog.nombre as programa_nombre
             FROM facturas f
             JOIN proveedores p ON f.proveedor_id = p.id
             LEFT JOIN programas prog ON f.programa_id = prog.id
             WHERE f.id = ?`,
            [id]
        );
        return rows[0];
    }

    // Crear nueva factura (con imagen)
    static async create(facturaData, imagen_url = null) {
        const {
            numero_factura,
            fecha_emision,
            proveedor_id,
            programa_id,
            subtotal,
            iva_total,
            estado,
            usuario_registro_id,
            observaciones
        } = facturaData;

        const [result] = await pool.query(
            `INSERT INTO facturas 
            (numero_factura, fecha_emision, proveedor_id, programa_id, subtotal, 
             iva_total, estado, usuario_registro_id, observaciones, imagen_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [numero_factura, fecha_emision, proveedor_id, programa_id, subtotal,
             iva_total, estado, usuario_registro_id, observaciones, imagen_url]
        );
        return result.insertId;
    }

    static async createDetails(facturaId, detalles = []) {
        if (!Array.isArray(detalles) || detalles.length === 0) {
            return;
        }

        const values = detalles.map(d => [facturaId, d.equipo_id, d.cantidad, d.precio_unitario]);
        await pool.query(
            'INSERT INTO detalle_factura (factura_id, equipo_id, cantidad, precio_unitario) VALUES ? ',
            [values]
        );
    }

    static async replaceDetails(facturaId, detalles = []) {
        await pool.query('DELETE FROM detalle_factura WHERE factura_id = ?', [facturaId]);
        if (Array.isArray(detalles) && detalles.length > 0) {
            await this.createDetails(facturaId, detalles);
        }
    }

    static async getDetails(facturaId) {
        const [rows] = await pool.query(
            `SELECT df.*, e.nombre as equipo_nombre
             FROM detalle_factura df
             JOIN equipos e ON df.equipo_id = e.id
             WHERE df.factura_id = ?`,
            [facturaId]
        );
        return rows;
    }

    // Actualizar factura
    static async update(id, facturaData, imagen_url = null) {
        const {
            numero_factura,
            fecha_emision,
            proveedor_id,
            programa_id,
            subtotal,
            iva_total,
            estado,
            observaciones
        } = facturaData;

        let query = `
            UPDATE facturas SET 
                numero_factura = ?, fecha_emision = ?, proveedor_id = ?,
                programa_id = ?, subtotal = ?, iva_total = ?, estado = ?,
                observaciones = ?
        `;
        const values = [numero_factura, fecha_emision, proveedor_id, programa_id, subtotal, iva_total, estado, observaciones];

        if (imagen_url) {
            query += `, imagen_url = ?`;
            values.push(imagen_url);
        }

        query += ` WHERE id = ?`;
        values.push(id);

        const [result] = await pool.query(query, values);
        return result.affectedRows > 0;
    }

    // Eliminar factura
    static async delete(id) {
        const [result] = await pool.query('DELETE FROM facturas WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    // Obtener estadísticas
    static async getStats() {
        const [totalFacturado] = await pool.query(
            "SELECT SUM(total) as total FROM facturas WHERE fecha_emision >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
        );
        const [totalFacturas] = await pool.query(
            "SELECT COUNT(*) as total FROM facturas WHERE fecha_emision >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)"
        );
        const [pendientes] = await pool.query(
            "SELECT COUNT(*) as total FROM facturas WHERE estado = 'Pendiente'"
        );
        return {
            totalFacturado: totalFacturado[0].total || 0,
            totalFacturas: totalFacturas[0].total || 0,
            facturasPendientes: pendientes[0].total || 0
        };
    }
}

module.exports = FacturaModel;