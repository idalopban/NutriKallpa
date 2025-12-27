// Script para generar hash con bcryptjs (la misma librería que usa la app)
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function fixPasswordWithCorrectHash() {
    console.log('=== GENERANDO HASH CORRECTO CON BCRYPTJS ===\n');

    const password = 'Admin123!';

    // Generar hash con bcryptjs
    const hash = await bcrypt.hash(password, 10);
    console.log('Nueva contraseña:', password);
    console.log('Nuevo hash:', hash);

    // Verificar que el hash funciona
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verificación local:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');

    if (!isValid) {
        console.error('ERROR: El hash generado no es válido');
        return;
    }

    // Leer .env.local
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const getEnv = (key) => {
        const match = envContent.match(new RegExp(`${key}=(.*)`));
        return match ? match[1].trim() : null;
    };

    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // Actualizar en la base de datos
    console.log('\nActualizando en la base de datos...');

    const { error } = await supabase
        .from('users')
        .update({
            password_hash: hash,
            updated_at: new Date().toISOString()
        })
        .eq('email', 'admin@nutrikallpa.com');

    if (error) {
        console.error('❌ Error al actualizar:', error.message);
        return;
    }

    console.log('\n✅ ¡ÉXITO! Contraseña actualizada correctamente');
    console.log('\n========================================');
    console.log('📧 Email: admin@nutrikallpa.com');
    console.log('🔑 Contraseña: Admin123!');
    console.log('========================================');
    console.log('\nAhora prueba hacer login en http://localhost:3000');
}

fixPasswordWithCorrectHash();
