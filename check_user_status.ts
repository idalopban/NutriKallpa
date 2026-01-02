
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createSupabaseAdmin } from "./src/lib/supabase-admin";

async function checkUser() {
    try {
        const supabase = createSupabaseAdmin();
        const targetEmail = "lopezbancesd@gmail.com";

        const { data: users, error } = await supabase
            .from("users")
            .select("id, email, nombre, rol")
            .eq("email", targetEmail);

        if (error) {
            console.error("Error searching for user:", error);
            return;
        }

        if (users && users.length > 0) {
            console.log(`User found: ${users[0].email} (${users[0].nombre})`);
        } else {
            console.log(`User ${targetEmail} not found.`);
        }

    } catch (e) {
        console.error("Exception:", e);
    }
}

checkUser();
