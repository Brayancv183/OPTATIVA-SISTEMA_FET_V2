const { pool } = require('../config/db');

const getDashboardData = async (req, res) => {
    try {
        // 1. Total de equipos activos
        const [totalEquipos] = await pool.query('SELECT COUNT(*) as total FROM equipos WHERE activo = TRUE');

        // 2. Valor total del inventario (suma de stock_actual * valor_unitario)
        const [valorInventario] = await pool.query('SELECT SUM(stock_actual * valor_unitario) as total FROM equipos WHERE activo = TRUE');

        // 3. Préstamos activos (estado = 'Activo' o 'Vencido'? según tu negocio, los activos son los que no se han devuelto)
        const [prestamosActivos] = await pool.query("SELECT COUNT(*) as total FROM prestamos WHERE estado IN ('Activo', 'Vencido')");

        // 4. Equipos con stock actual <= stock mínimo
        const [equiposBajoStock] = await pool.query('SELECT COUNT(*) as total FROM equipos WHERE activo = TRUE AND stock_actual <= stock_minimo');

        // 5. Alertas activas de stock
        const [alertasActivas] = await pool.query('SELECT COUNT(*) as total FROM alertas_stock WHERE estado = "Activa"');

        // 6. Préstamos vencidos (fecha_devolucion_esperada < CURDATE() y estado = 'Activo')
        const [prestamosVencidos] = await pool.query("SELECT COUNT(*) as total FROM prestamos WHERE estado = 'Activo' AND fecha_devolucion_esperada < CURDATE()");

        // 7. Movimientos recientes (últimos 5)
        const [movimientosRecientes] = await pool.query(`
            SELECT m.*, e.nombre as equipo_nombre 
            FROM movimientos m
            JOIN equipos e ON m.equipo_id = e.id
            ORDER BY m.fecha DESC LIMIT 5
        `);

        // 8. Alertas de stock mínimos (para mostrar en el dashboard)
        const [alertasLista] = await pool.query(`
            SELECT a.*, e.nombre as equipo_nombre, e.stock_actual, e.stock_minimo
            FROM alertas_stock a
            JOIN equipos e ON a.equipo_id = e.id
            WHERE a.estado = 'Activa'
            ORDER BY FIELD(a.prioridad, 'Crítica', 'Alta', 'Media', 'Baja')
            LIMIT 5
        `);

        // 9. Equipos críticos (bajo stock)
        const [equiposCriticos] = await pool.query(`
            SELECT nombre, stock_actual, stock_minimo, categoria
            FROM equipos
            WHERE activo = TRUE AND stock_actual <= stock_minimo
            ORDER BY (stock_actual / stock_minimo) ASC
            LIMIT 5
        `);

        // 10. Estadísticas de préstamos (activos, pendientes de devolución, disponibles)
        const [prestamosStats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM prestamos WHERE estado IN ('Activo', 'Vencido')) as activos,
                (SELECT COUNT(*) FROM prestamos WHERE estado = 'Activo' AND fecha_devolucion_esperada < CURDATE()) as pendientes,
                (SELECT SUM(stock_actual) FROM equipos WHERE activo = TRUE) as total_disponible
        `);

        // 11. Porcentaje de capacidad utilizada (préstamos activos sobre total equipos)
        const totalStock = await pool.query('SELECT SUM(stock_actual) as total FROM equipos WHERE activo = TRUE');
        const capacidadUtilizada = totalStock[0].total > 0 ? (prestamosStats[0].activos / totalStock[0].total) * 100 : 0;

        // 12. Promedio de días de vencimiento (solo préstamos activos)
        const [promedioVencimiento] = await pool.query(`
            SELECT AVG(DATEDIFF(fecha_devolucion_esperada, CURDATE())) as promedio
            FROM prestamos
            WHERE estado = 'Activo' AND fecha_devolucion_esperada >= CURDATE()
        `);

        // 13. Porcentaje de inventario disponible
        const inventarioDisponible = totalStock[0].total > 0 ? ((totalStock[0].total - prestamosStats[0].activos) / totalStock[0].total) * 100 : 0;

        // 14. Totales vs mes pasado (para las tendencias)
        const [totalEquiposMesPasado] = await pool.query(`
            SELECT COUNT(*) as total FROM equipos 
            WHERE activo = TRUE AND created_at < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        `);
        const [valorInventarioMesPasado] = await pool.query(`
            SELECT SUM(stock_actual * valor_unitario) as total FROM equipos 
            WHERE activo = TRUE AND created_at < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        `);
        const [prestamosActivosMesPasado] = await pool.query(`
            SELECT COUNT(*) as total FROM prestamos 
            WHERE estado IN ('Activo', 'Vencido') AND created_at < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        `);
        const [bajoStockMesPasado] = await pool.query(`
            SELECT COUNT(*) as total FROM equipos 
            WHERE activo = TRUE AND stock_actual <= stock_minimo AND created_at < DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        `);

        // Calcular tendencias (en porcentaje)
        const trendEquipos = totalEquiposMesPasado[0].total > 0 
            ? ((totalEquipos[0].total - totalEquiposMesPasado[0].total) / totalEquiposMesPasado[0].total) * 100 
            : 0;
        const trendValor = valorInventarioMesPasado[0].total > 0 
            ? ((valorInventario[0].total - valorInventarioMesPasado[0].total) / valorInventarioMesPasado[0].total) * 100 
            : 0;
        const trendPrestamos = prestamosActivosMesPasado[0].total > 0 
            ? ((prestamosActivos[0].total - prestamosActivosMesPasado[0].total) / prestamosActivosMesPasado[0].total) * 100 
            : 0;
        const trendBajoStock = bajoStockMesPasado[0].total > 0 
            ? ((equiposBajoStock[0].total - bajoStockMesPasado[0].total) / bajoStockMesPasado[0].total) * 100 
            : 0;

        res.json({
            success: true,
            data: {
                kpis: {
                    totalEquipos: totalEquipos[0].total,
                    valorTotalInventario: valorInventario[0].total || 0,
                    prestamosActivos: prestamosActivos[0].total,
                    equiposBajoStock: equiposBajoStock[0].total,
                    alertasActivas: alertasActivas[0].total,
                    prestamosVencidos: prestamosVencidos[0].total,
                    trends: {
                        totalEquipos: trendEquipos.toFixed(1),
                        valorInventario: trendValor.toFixed(1),
                        prestamosActivos: trendPrestamos.toFixed(1),
                        equiposBajoStock: trendBajoStock.toFixed(1)
                    }
                },
                movimientosRecientes: movimientosRecientes,
                alertasLista: alertasLista,
                equiposCriticos: equiposCriticos,
                loanStats: {
                    activos: prestamosStats[0].activos,
                    pendientes: prestamosStats[0].pendientes,
                    disponibles: prestamosStats[0].total_disponible || 0
                },
                capacidadUtilizada: capacidadUtilizada.toFixed(1),
                promedioVencimiento: promedioVencimiento[0].promedio ? Math.round(promedioVencimiento[0].promedio) : 0,
                inventarioDisponible: inventarioDisponible.toFixed(1)
            }
        });
    } catch (error) {
        console.error('Error al obtener datos del dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos del dashboard'
        });
    }
};

module.exports = { getDashboardData };