const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function diagnose() {
    console.log('=== DIAGNÓSTICO DE LOGIN ===\n');

    try {
        // 1. Read .env.local
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');

        const getEnv = (key) => {
            const match = envContent.match(new RegExp(`${key}=(.*)`));
            return match ? match[1].trim() : null;
        };

        const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
        const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');

        if (!url || !key) {
            console.error('❌ No se encontraron las variables de entorno');
            return;
        }

        console.log('✅ Conectando a Supabase:', url.substring(0, 30) + '...\n');

        const supabase = createClient(url, key, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 2. List all users
        console.log('--- USUARIOS EN LA BASE DE DATOS ---');
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, nombre, rol, password_hash');

        if (error) {
            console.error('❌ Error al consultar usuarios:', error.message);
            return;
        }

        if (!users || users.length === 0) {
            console.log('⚠️  NO HAY USUARIOS EN LA BASE DE DATOS');
            console.log('\n🔧 SOLUCIÓN: Ejecuta este SQL en Supabase Dashboard:\n');
            console.log(`INSERT INTO users (email, password_hash, nombre, rol, especialidad)
VALUES (
    'admin@nutrikallpa.com',
    '$2b$10$rqHvw8Px.5FoXLQ5KXSQTOvNuIpN7GiQ6Y0J5Lw3VpXvQpKQJZ9TO',
    'Administrador NutriKallpa',
    'admin',
    'Gestión del Sistema'
);`);
            return;
        }

        console.log(`Encontrados ${users.length} usuario(s):\n`);

        for (const user of users) {
            console.log(`📧 Email: ${user.email}`);
            console.log(`   Nombre: ${user.nombre}`);
            console.log(`   Rol: ${user.rol}`);
            console.log(`   Hash existe: ${user.password_hash ? 'SÍ (' + user.password_hash.substring(0, 15) + '...)' : 'NO ❌'}`);
            console.log('');
        }

        // 3. Check invitation codes
        console.log('--- CÓDIGOS DE INVITACIÓN ---');
        const { data: codes, error: codeError } = await supabase
            .from('invitation_codes')
            .select('*');

        if (codeError) {
            console.log('❌ Error al consultar códigos:', codeError.message);
        } else if (!codes || codes.length === 0) {
            console.log('⚠️  No hay códigos de invitación');
        } else {
            codes.forEach(c => {
                console.log(`   ${c.code} [${c.rol}] - ${c.status}`);
            });
        }

        console.log('\n--- FIN DEL DIAGNÓSTICO ---');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

diagnose();
