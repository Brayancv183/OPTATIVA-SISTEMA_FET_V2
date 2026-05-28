const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const { testConnection } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración CORS (permite todos los orígenes para desarrollo)
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true
}));

// Servir archivos estáticos (imágenes de facturas)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ============================================
// IMPORTAR RUTAS (solo una declaración)
// ============================================
let authRoutes, equiposRoutes, proveedoresRoutes, movimientosRoutes, prestamosRoutes, solicitudesRoutes, facturasRoutes, alertasRoutes, dashboardRoutes;

try { authRoutes = require('./routes/auth.routes'); console.log('✅ Ruta auth cargada'); } catch(e) { console.error('❌ Error auth:', e.message); }
try { equiposRoutes = require('./routes/equipos.routes'); console.log('✅ Ruta equipos cargada'); } catch(e) { console.error('❌ Error equipos:', e.message); }
try { proveedoresRoutes = require('./routes/proveedores.routes'); console.log('✅ Ruta proveedores cargada'); } catch(e) { console.error('❌ Error proveedores:', e.message); }
try { movimientosRoutes = require('./routes/movimientos.routes'); console.log('✅ Ruta movimientos cargada'); } catch(e) { console.error('❌ Error movimientos:', e.message); }
try { prestamosRoutes = require('./routes/prestamos.routes'); console.log('✅ Ruta prestamos cargada'); } catch(e) { console.error('❌ Error prestamos:', e.message); }
try { solicitudesRoutes = require('./routes/solicitudes.routes'); console.log('✅ Ruta solicitudes cargada'); } catch(e) { console.error('❌ Error solicitudes:', e.message); }
try { facturasRoutes = require('./routes/facturas.routes'); console.log('✅ Ruta facturas cargada'); } catch(e) { console.error('❌ Error facturas:', e.message); }
try { alertasRoutes = require('./routes/alertas.routes'); console.log('✅ Ruta alertas cargada'); } catch(e) { console.error('❌ Error alertas:', e.message); }
try { dashboardRoutes = require('./routes/dashboard.routes'); console.log('✅ Ruta dashboard cargada'); } catch(e) { console.error('❌ Error dashboard:', e.message); }

// ============================================
// REGISTRAR RUTAS
// ============================================
if (authRoutes) app.use('/api/auth', authRoutes);
if (equiposRoutes) app.use('/api/equipos', equiposRoutes);
if (proveedoresRoutes) app.use('/api/proveedores', proveedoresRoutes);
if (movimientosRoutes) app.use('/api/movimientos', movimientosRoutes);
if (prestamosRoutes) app.use('/api/prestamos', prestamosRoutes);
if (solicitudesRoutes) app.use('/api/solicitudes', solicitudesRoutes);
if (facturasRoutes) app.use('/api/facturas', facturasRoutes);
if (alertasRoutes) app.use('/api/alertas', alertasRoutes);
if (dashboardRoutes) app.use('/api/dashboard', dashboardRoutes);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Sistema FET API funcionando',
        timestamp: new Date().toISOString(),
        routes: {
            auth: !!authRoutes, equipos: !!equiposRoutes, proveedores: !!proveedoresRoutes,
            movimientos: !!movimientosRoutes, prestamos: !!prestamosRoutes,
            solicitudes: !!solicitudesRoutes, facturas: !!facturasRoutes,
            alertas: !!alertasRoutes, dashboard: !!dashboardRoutes
        }
    });
});

// ============================================
// MANEJO DE RUTAS NO ENCONTRADAS (404)
// ============================================
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.originalUrl}` });
});

// ============================================
// MIDDLEWARE DE ERRORES GLOBAL
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error no capturado:', err.stack);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
const startServer = async () => {
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('❌ No se pudo conectar a la base de datos. El servidor no se iniciará.');
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📝 Health check: http://localhost:${PORT}/api/health\n`);
    });
};

startServer();