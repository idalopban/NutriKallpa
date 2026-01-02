
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createSupabaseAdmin } from "./src/lib/supabase-admin";
import { hashPassword } from "./src/lib/password-utils";

async function resetAdmin() {
    try {
        console.log("🔒 Starting admin credential reset (ADMIN MODE)...");

        // Use Admin Client to bypass RLS
        const supabase = createSupabaseAdmin();

        // 1. Check for existing admin users
        const { data: admins, error: searchError } = await supabase
            .from("users")
            .select("id, email, rol, nombre")
            .eq("rol", "admin");

        if (searchError) {
            console.error("❌ Error searching for admins:", searchError);
            return;
        }

        console.log(`Found ${admins?.length || 0} admin(s):`);
        admins?.forEach(a => console.log(` - ${a.email} (${a.nombre})`));

        // 2. Identify target admin
        const targetEmail = "admin@nutrikallpa.com";
        const hasDefaultAdmin = admins?.some(a => a.email === targetEmail);

        const newPassword = "NutriKallpa2024!";
        const newHash = await hashPassword(newPassword);

        if (hasDefaultAdmin) {
            // Update existing
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
                console.log("✅ SUCCESS: Password reset successfully.");
            }
        } else {
            // Create new if missing
            console.log(`\n➕ Creating new admin ${targetEmail}...`);
            const { error: createError } = await supabase
                .from("users")
                .insert({
                    email: targetEmail,
                    password_hash: newHash,
                    nombre: "Administrador NutriKallpa",
                    rol: "admin",
                    especialidad: "Soporte Técnico",
                    cmp: "00000",
                    is_active: true,
                    subscription_status: 'unlimited'
                });

            if (createError) {
                console.error("❌ Creation failed:", createError);
            } else {
                console.log("✅ SUCCESS: Admin account created successfully.");
            }
        }

    } catch (e) {
        console.error("❌ Exception:", e);
    }
}

resetAdmin();
