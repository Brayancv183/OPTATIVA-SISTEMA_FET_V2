-- ============================================
-- SISTEMA FET - GESTIÓN DE EQUIPOS DEPORTIVOS
-- Script completo de Base de Datos (CORREGIDO)
-- ============================================

-- 1. Crear y seleccionar la base de datos
DROP DATABASE IF EXISTS sistema_fet;
CREATE DATABASE sistema_fet;
USE sistema_fet;

-- 2. Tabla: usuarios (Almacena los usuarios del sistema)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'coordinador', 'almacenista') DEFAULT 'coordinador',
    telefono VARCHAR(20),
    area_departamento VARCHAR(100),
    avatar_iniciales CHAR(2),
    activo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Tabla: programas
CREATE TABLE IF NOT EXISTS programas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    responsable_id INT,
    presupuesto_anual DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 4. Tabla: proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    contacto_nombre VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla: equipos
CREATE TABLE IF NOT EXISTS equipos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50),
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    valor_unitario DECIMAL(10,2) NOT NULL,
    iva DECIMAL(5,2) DEFAULT 19.0,
    proveedor_id INT,
    ubicacion VARCHAR(100),
    unidad_medida VARCHAR(20) DEFAULT 'Unidad',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
);

-- 6. Tabla: prestamos
CREATE TABLE IF NOT EXISTS prestamos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    equipo_id INT NOT NULL,
    solicitud_id INT NULL,
    solicitante_nombre VARCHAR(150) NOT NULL,
    solicitante_identificacion VARCHAR(50),
    solicitante_email VARCHAR(100),
    fecha_prestamo DATE NOT NULL,
    fecha_devolucion_esperada DATE NOT NULL,
    fecha_devolucion_real DATE NULL,
    estado ENUM('Activo', 'Vencido', 'Devuelto', 'Danado') DEFAULT 'Activo',
    condicion_entrega TEXT,
    condicion_recibido TEXT,
    usuario_prestamista_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id),
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_prestamista_id) REFERENCES usuarios(id)
);

-- 7. Tabla: facturas
CREATE TABLE IF NOT EXISTS facturas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    fecha_emision DATE NOT NULL,
    proveedor_id INT NOT NULL,
    programa_id INT,
    subtotal DECIMAL(12,2) NOT NULL,
    iva_total DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) GENERATED ALWAYS AS (subtotal + iva_total) STORED,
    estado ENUM('Validada', 'Pendiente', 'Con Diferencias') DEFAULT 'Pendiente',
    archivo_url VARCHAR(500),
    usuario_registro_id INT,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (programa_id) REFERENCES programas(id),
    FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id)
);

-- 8. Tabla: detalle_factura
CREATE TABLE IF NOT EXISTS detalle_factura (
    id INT PRIMARY KEY AUTO_INCREMENT,
    factura_id INT NOT NULL,
    equipo_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

-- 9. Tabla: solicitudes
CREATE TABLE IF NOT EXISTS solicitudes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo_solicitud VARCHAR(20) UNIQUE NOT NULL,
    solicitante_nombre VARCHAR(150) NOT NULL,
    dependencia VARCHAR(100),
    fecha_solicitud DATE NOT NULL,
    fecha_necesidad DATE,
    estado ENUM('Pendiente', 'Aprobada', 'Rechazada', 'En Proceso') DEFAULT 'Pendiente',
    prioridad ENUM('Alta', 'Media', 'Baja') DEFAULT 'Media',
    valor_total_estimado DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_aprobador_id INT,
    fecha_aprobacion DATE,
    FOREIGN KEY (usuario_aprobador_id) REFERENCES usuarios(id)
);

-- 10. Tabla: detalle_solicitud
CREATE TABLE IF NOT EXISTS detalle_solicitud (
    id INT PRIMARY KEY AUTO_INCREMENT,
    solicitud_id INT NOT NULL,
    equipo_id INT NOT NULL,
    cantidad_solicitada INT NOT NULL,
    cantidad_aprobada INT,
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id)
);

-- 11. Tabla: movimientos
CREATE TABLE IF NOT EXISTS movimientos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tipo ENUM('Entrada', 'Salida') NOT NULL,
    equipo_id INT NOT NULL,
    cantidad INT NOT NULL,
    valor_unitario_momento DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * valor_unitario_momento) STORED,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT,
    origen_destino VARCHAR(255),
    factura_id INT NULL,
    prestamo_id INT NULL,
    estado ENUM('Completada', 'Pendiente') DEFAULT 'Completada',
    notas TEXT,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL,
    FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE SET NULL
);

-- 12. Tabla: alertas_stock
CREATE TABLE IF NOT EXISTS alertas_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    equipo_id INT NOT NULL,
    nivel VARCHAR(20) DEFAULT 'Crítica',
    prioridad ENUM('Crítica', 'Alta', 'Media', 'Baja') DEFAULT 'Media',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Activa', 'Atendida') DEFAULT 'Activa',
    atendida_por INT,
    fecha_atencion TIMESTAMP NULL,
    FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE,
    FOREIGN KEY (atendida_por) REFERENCES usuarios(id)



    USE sistema_fet;

-- Añadir columna para la ruta de la imagen (si no existe)
ALTER TABLE facturas ADD COLUMN imagen_url VARCHAR(500) NULL AFTER archivo_url;

-- Verificar
DESCRIBE facturas;
);


ALTER TABLE usuarios ADD COLUMN avatar_url VARCHAR(500) NULL;
-- ============================================
-- SEED DATA (DATOS DE EJEMPLO)
-- ============================================

-- Usuarios (contraseña: 'password123' para todos)
-- El hash de bcrypt para 'password123' es: $2a$10$uP7jL.lYqZ5M6kQsKxQzgu5Q4cC5d5e5f5g5h5i5j5k5l5m5n5o5p5q
INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, area_departamento, avatar_iniciales) VALUES
('Admin Sistema', 'admin@fet.com', '$2a$10$uP7jL.lYqZ5M6kQsKxQzgu5Q4cC5d5e5f5g5h5i5j5k5l5m5n5o5p5q', 'admin', '3001234567', 'TI', 'AD'),
('Carlos Martínez', 'carlos.martinez@fet.com', '$2a$10$uP7jL.lYqZ5M6kQsKxQzgu5Q4cC5d5e5f5g5h5i5j5k5l5m5n5o5p5q', 'coordinador', '3109876543', 'Coordinación Deportes', 'CM'),
('Laura Gómez', 'laura.gomez@fet.com', '$2a$10$uP7jL.lYqZ5M6kQsKxQzgu5Q4cC5d5e5f5g5h5i5j5k5l5m5n5o5p5q', 'almacenista', '3204567890', 'Almacén', 'LG');

-- Programas
INSERT INTO programas (nombre, responsable_id, presupuesto_anual) VALUES
('Fútbol', 2, 15000000),
('Tenis', 2, 8000000),
('Baloncesto', 2, 10000000),
('Gimnasia', 2, 5000000);

-- Proveedores
INSERT INTO proveedores (nombre, contacto_nombre, telefono, email, direccion) VALUES
('Deportes Total SAS', 'Juan Pérez', '6015551234', 'ventas@deportestotal.com', 'Calle 45 # 20-30, Bogotá'),
('Equipos Elite', 'María López', '6015555678', 'maria@equiposelite.com', 'Carrera 15 # 88-12, Medellín'),
('Proveedora Deportiva FET', 'Pedro Rodríguez', '6015559012', 'pedro.proveedora@fet.com', 'Avenida 19 # 123-45, Bogotá');

-- Equipos
INSERT INTO equipos (codigo, nombre, descripcion, categoria, stock_actual, stock_minimo, valor_unitario, iva, proveedor_id, ubicacion, unidad_medida) VALUES
('FUT-001', 'Balón Profesional Fútbol', 'Balón talla 5, cosido a mano, uso profesional', 'Fútbol', 25, 10, 85000, 19, 1, 'DEP-A-01', 'Unidad'),
('FUT-002', 'Conos de Entrenamiento', 'Set de 20 conos naranjas de 30cm', 'Fútbol', 120, 20, 45000, 19, 1, 'DEP-A-02', 'Set'),
('TEN-001', 'Raqueta Pro Tennis', 'Raqueta de carbono, peso 280gr', 'Tenis', 8, 5, 320000, 19, 2, 'DEP-B-01', 'Unidad'),
('TEN-002', 'Pelotas Tenis (Caja 3 und)', 'Caja con 3 pelotas de alta durabilidad', 'Tenis', 45, 15, 25000, 19, 2, 'DEP-B-02', 'Caja'),
('BAS-001', 'Balón Baloncesto Oficial', 'Talla 7, cuero sintético', 'Baloncesto', 15, 8, 125000, 19, 1, 'DEP-C-01', 'Unidad'),
('BAS-002', 'Red de Baloncesto', 'Red reforzada para aro estándar', 'Baloncesto', 10, 3, 35000, 19, 1, 'DEP-C-02', 'Par'),
('GIM-001', 'Colchoneta 2x1m', 'Colchoneta plegable de 5cm grosor', 'Gimnasia', 6, 4, 280000, 19, 3, 'DEP-D-01', 'Unidad'),
('GIM-002', 'Aro de Gimnasia', 'Aro de madera profesional', 'Gimnasia', 4, 3, 95000, 19, 3, 'DEP-D-02', 'Unidad'),
('ACC-001', 'Silbato Profesional', 'Silbato metálico de alta frecuencia', 'Accesorios', 50, 10, 12000, 19, 2, 'DEP-E-01', 'Unidad'),
('ACC-002', 'Pitido de Entrenador', 'Cronómetro y silbato 2-en-1', 'Accesorios', 3, 2, 45000, 19, 2, 'DEP-E-02', 'Unidad');

-- Factura de ejemplo
INSERT INTO facturas (numero_factura, fecha_emision, proveedor_id, programa_id, subtotal, iva_total, estado, usuario_registro_id) VALUES
('FAC-001', '2025-04-10', 1, 1, 425000, 80750, 'Validada', 1);

INSERT INTO detalle_factura (factura_id, equipo_id, cantidad, precio_unitario) VALUES
(1, 1, 5, 85000);

-- Movimiento de entrada
INSERT INTO movimientos (tipo, equipo_id, cantidad, valor_unitario_momento, usuario_id, origen_destino, factura_id, estado) VALUES
('Entrada', 1, 5, 85000, 1, 'Compra - Factura FAC-001', 1, 'Completada');

-- Préstamo activo
INSERT INTO prestamos (equipo_id, solicitante_nombre, solicitante_identificacion, solicitante_email, fecha_prestamo, fecha_devolucion_esperada, estado, condicion_entrega, usuario_prestamista_id) VALUES
(3, 'Pedro Gómez', '123456789', 'pedro.gomez@email.com', '2025-05-10', '2025-05-25', 'Activo', 'Raqueta en perfecto estado', 2);

-- Actualizar stock por préstamo
UPDATE equipos SET stock_actual = stock_actual - 1 WHERE id = 3;

INSERT INTO movimientos (tipo, equipo_id, cantidad, valor_unitario_momento, usuario_id, origen_destino, prestamo_id, estado) VALUES
('Salida', 3, 1, 320000, 2, 'Préstamo a Pedro Gómez', 1, 'Completada');

-- Solicitud de ejemplo
INSERT INTO solicitudes (codigo_solicitud, solicitante_nombre, dependencia, fecha_solicitud, fecha_necesidad, estado, prioridad, valor_total_estimado) VALUES
('SOL-001', 'Entrenador Luis Fernández', 'Escuela de Fútbol', '2025-05-15', '2025-05-30', 'Pendiente', 'Alta', 340000);

INSERT INTO detalle_solicitud (solicitud_id, equipo_id, cantidad_solicitada) VALUES
(1, 1, 4);

-- Alertas de stock
INSERT INTO alertas_stock (equipo_id, prioridad, estado) VALUES 
(8, 'Media', 'Activa'),
(10, 'Media', 'Activa');

-- Actualizar una alerta a Crítica para demostración
UPDATE alertas_stock SET prioridad = 'Crítica' WHERE id = 2;

-- Verificar que todo se creó correctamente
SELECT '✅ Base de datos creada exitosamente' as Mensaje;
SELECT COUNT(*) as Total_Usuarios FROM usuarios;
SELECT COUNT(*) as Total_Equipos FROM equipos;
SELECT COUNT(*) as Total_Proveedores FROM proveedores;

COMMIT;