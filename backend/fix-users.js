const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function fixUsers() {
    console.log('🔧 Corrigiendo usuarios...\n');
    
    // Cambia la contraseña por la tuya
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sistema_fet'
    });
    
    // Generar hash correcto
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('✅ Hash generado:', hash);
    console.log('');
    
    // Desactivar restricciones de clave foránea
    await connection.execute('SET FOREIGN_KEY_CHECKS=0');
    
    // Eliminar usuarios existentes
    await connection.execute('DELETE FROM usuarios');
    console.log('🗑️ Usuarios antiguos eliminados');
    
    // Reactivar restricciones
    await connection.execute('SET FOREIGN_KEY_CHECKS=1');
    
    // Insertar usuarios con el hash correcto
    const usuarios = [
        ['Admin Sistema', 'admin@fet.com', hash, 'admin', '3001234567', 'TI', 'AD'],
        ['Carlos Martínez', 'carlos.martinez@fet.com', hash, 'coordinador', '3109876543', 'Coordinación Deportes', 'CM'],
        ['Laura Gómez', 'laura.gomez@fet.com', hash, 'almacenista', '3204567890', 'Almacén', 'LG']
    ];
    
    for (const user of usuarios) {
        await connection.execute(
            `INSERT INTO usuarios 
            (nombre, email, password_hash, rol, telefono, area_departamento, avatar_iniciales, activo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            user
        );
        console.log(`✅ Usuario creado: ${user[0]} (${user[1]})`);
    }
    
    console.log('\n📋 Verificando...');
    const [rows] = await connection.execute(
        'SELECT id, nombre, email, rol FROM usuarios'
    );
    console.table(rows);
    
    console.log('\n🎉 Listo! Ahora prueba login con:');
    console.log('   Email: admin@fet.com');
    console.log('   Contraseña: password123');
    
    await connection.end();
}

fixUsers().catch(console.error);