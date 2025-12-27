
import { createPostgrestClient } from './src/lib/postgrest';
import * as dotenv from 'dotenv';
import path from 'path';

// Manual loading of .env.local because ts-node might not find it
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkUsers() {
    console.log('--- Checking Users in Database ---');
    try {
        const client = createPostgrestClient();
        const { data: users, error } = await client
            .from('users')
            .select('id, email, rol, nombre');

        if (error) {
            console.error('Error fetching users:', error);
            return;
        }

        if (!users || users.length === 0) {
            console.log('No users found in database.');
        } else {
            console.log(`Found ${users.length} users:`);
            users.forEach(u => {
                console.log(`- [${u.rol}] ${u.nombre} (${u.email})`);
            });
        }

        const { data: codes, error: codeError } = await client
            .from('invitation_codes')
            .select('*');

        if (!codeError && codes) {
            console.log('\n--- Invitation Codes ---');
            codes.forEach(c => {
                console.log(`- ${c.code} [${c.rol}] - ${c.status}`);
            });
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkUsers();
