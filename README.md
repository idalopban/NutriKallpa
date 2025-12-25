# NutriKallpa

Sistema de gestión nutricional para profesionales de la salud. Permite la gestión integral de pacientes, evaluaciones antropométricas avanzadas (ISAK), cálculos de composición corporal y planificación de dietas personalizadas.

## 🛠️ Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| **Framework** | Next.js 16 (App Router + Turbopack) |
| **Frontend** | React 19, TypeScript 5 |
| **Estilos** | Tailwind CSS 4 + Radix UI |
| **Estado** | Zustand |
| **Backend** | Supabase (Auth + PostgreSQL) |
| **PDF** | jsPDF + jspdf-autotable |
| **3D** | React Three Fiber + Three.js |
| **Animaciones** | Framer Motion |
| **Testing** | Vitest |

## 📂 Estructura del Proyecto

```
src/
├── app/                  # Rutas Next.js (App Router)
│   ├── (main)/           # Rutas protegidas
│   │   ├── dashboard/    # Panel principal
│   │   ├── pacientes/    # Gestión de pacientes
│   │   ├── antropometria/# Evaluaciones antropométricas
│   │   ├── dietas/       # Planes nutricionales
│   │   └── agenda/       # Citas
│   ├── auth/             # OAuth callbacks
│   └── register/         # Registro de usuarios
├── components/           # Componentes React
│   ├── antropometria/    # Componentes de evaluación antropométrica
│   ├── diet/             # Gestión de dietas
│   ├── dashboard/        # Widgets del dashboard
│   └── ui/               # Componentes base (Radix)
├── lib/                  # Utilidades y servicios
│   ├── supabase.ts       # Cliente Supabase
│   ├── somatotype-utils.ts # Cálculos de somatotipo
│   ├── bodyCompositionMath.ts # Composición corporal 2C
│   ├── fiveComponentMath.ts   # Fraccionamiento 5C (Kerr)
│   └── calculos-nutricionales.ts # Fórmulas nutricionales
├── store/                # Estado global (Zustand)
│   ├── useAuthStore.ts
│   ├── usePatientStore.ts
│   ├── useAnthropometryStore.ts
│   └── useNotificationStore.ts
├── types/                # Definiciones TypeScript
└── tests/                # Tests unitarios
```

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd nutrikallpa

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar servidor de desarrollo
npm run dev
```

## ⚙️ Variables de Entorno

Crear un archivo `.env.local` con las siguientes variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Opcional: PostgREST directo
POSTGREST_URL=https://your-project.supabase.co/rest/v1
POSTGREST_API_KEY=your-api-key
```

## 📜 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo con Turbopack |
| `npm run build` | Compila para producción |
| `npm run start` | Inicia servidor de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm test` | Ejecuta tests con Vitest |

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con UI interactiva
npm run test -- --ui
```

## 🌟 Funcionalidades Principales

- **Autenticación** - Login con email/contraseña y Google OAuth
- **Gestión de Pacientes** - CRUD completo con historial clínico
- **Antropometría** - 8 pliegues, perímetros y diámetros
- **Composición Corporal** - Modelos 2C y 5 componentes (Kerr)
- **Somatotipo Heath-Carter** - Clasificación en 13 categorías
- **Somatocarta Visual** - Gráfico interactivo de triángulo de Reuleaux
- **Planificación de Dietas** - Generador con recetas peruanas
- **Generación de PDFs** - Reportes profesionales
- **Visor 3D** - Modelo interactivo del cuerpo humano
- **Modo Oscuro** - Tema premium global

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.
