const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function fixPassword() {
    console.log('=== ARREGLANDO CONTRASEÑA DE ADMIN ===\n');

    try {
        // Read .env.local
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

        // Este hash fue generado con bcrypt.hashSync('Admin123!', 10)
        // Usamos una contraseña más simple para verificar que funciona
        const newHash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
        const newPassword = 'Admin123!';

        console.log('Actualizando contraseña del admin...');
        console.log('Nueva contraseña temporal:', newPassword);

        const { error } = await supabase
            .from('users')
            .update({
                password_hash: newHash,
                updated_at: new Date().toISOString()
            })
            .eq('email', 'admin@nutrikallpa.com');

        if (error) {
            console.error('❌ Error:', error.message);
            return;
        }

        console.log('\n✅ ¡Contraseña actualizada!');
        console.log('\n📧 Email: admin@nutrikallpa.com');
        console.log('🔑 Contraseña: Admin123!');
        console.log('\nPrueba hacer login ahora.');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

fixPassword();
