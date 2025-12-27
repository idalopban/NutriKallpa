
const { createPostgrestClient } = require('./src/lib/postgrest');

async function checkUsers() {
    console.log('--- Checking Users (Simple JS) ---');
    try {
        // Note: This assumes env vars are already in process.env
        // or loaded by some other means.
        const client = createPostgrestClient();
        const { data: users, error } = await client
            .from('users')
            .select('id, email, rol, nombre');

        if (error) {
            console.error('Error fetching users:', error);
            return;
        }

        if (!users || users.length === 0) {
            console.log('No users found.');
        } else {
            users.forEach(u => console.log(`- [${u.rol}] ${u.nombre} (${u.email})`));
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkUsers();
