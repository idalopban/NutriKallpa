import { NextRequest, NextResponse } from 'next/server';
import { createPostgrestClient } from '@/lib/postgrest';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ exists: false, error: 'Email required' }, { status: 400 });
        }

        const postgrest = createPostgrestClient();
        const { data: users, error } = await postgrest
            .from('users')
            .select('id, email, nombre, rol, especialidad, cmp, telefono, bio, photo_url, clinic_name, clinic_address, clinic_phone')
            .eq('email', email.toLowerCase().trim())
            .limit(1);

        if (error) {
            console.error('[CHECK_USER] Error:', error);
            return NextResponse.json({ exists: false, error: 'Database error' }, { status: 500 });
        }

        const user = users?.[0];

        if (user) {
            return NextResponse.json({
                exists: true,
                user: {
                    id: user.id,
                    email: user.email,
                    nombre: user.nombre,
                    rol: user.rol,
                    especialidad: user.especialidad,
                    cmp: user.cmp,
                    telefono: user.telefono,
                    bio: user.bio,
                    photoUrl: user.photo_url,
                    clinicName: user.clinic_name,
                    clinicAddress: user.clinic_address,
                    clinicPhone: user.clinic_phone,
                },
            });
        }

        return NextResponse.json({ exists: false });
    } catch (error) {
        console.error('[CHECK_USER] Unexpected error:', error);
        return NextResponse.json({ exists: false, error: 'Server error' }, { status: 500 });
    }
}
