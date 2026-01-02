
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createSupabaseAdmin } from "./src/lib/supabase-admin";
import { hashPassword } from "./src/lib/password-utils";

async function resetPassword() {
    try {
        console.log("🔒 Starting password reset...");

        const supabase = createSupabaseAdmin();
        const targetEmail = "lopezbancesd@gmail.com";
        const newPassword = "NutriKallpa2024!";

        const newHash = await hashPassword(newPassword);

        console.log(`\n🔄 Updating password for ${targetEmail}...`);
        const { error: updateError } = await supabase
            .from("users")
            .update({
                password_hash: newHash,
                updated_at: new Date().toISOString()
            })
            .eq("email", targetEmail);

        if (updateError) {
            console.error("❌ Update failed:", updateError);
        } else {
            console.log(`✅ SUCCESS: Password for ${targetEmail} reset to: ${newPassword}`);
        }

    } catch (e) {
        console.error("❌ Exception:", e);
    }
}

resetPassword();
