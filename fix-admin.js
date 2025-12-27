
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function fix() {
    console.log('--- Admin Access Recovery ---');

    try {
        // 1. Read .env.local manually
        const envPath = path.resolve(process.cwd(), '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');

        const getEnv = (key) => {
            const match = envContent.match(new RegExp(`${key}=(.*)`));
            return match ? match[1].trim() : null;
        };

        const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
        const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');

        if (!url || !key) {
            console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
            process.exit(1);
        }

        console.log('Connecting to:', url);

        // 2. Initialize Supabase Admin
        const supabase = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 3. Insert new code
        const newCode = 'ADMIN-RECOVERY-2025';
        const { error } = await supabase
            .from('invitation_codes')
            .upsert({
                code: newCode,
                rol: 'admin',
                status: 'active',
                created_at: new Date().toISOString()
            }, { onConflict: 'code' });

        if (error) {
            console.error('Error inserting code:', error);
            process.exit(1);
        }

        console.log(`Successfully created/restored code: ${newCode}`);

    } catch (err) {
        console.error('Unexpected error:', err.message);
        process.exit(1);
    }
}

fix();
