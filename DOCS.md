# 📘 NutriKallpa - Documentación Técnica

> **Sistema de Gestión Nutricional Profesional**  
> Versión: 0.1.0 | Última actualización: Diciembre 2024

---

## 📋 Índice

1. [Descripción General](#-descripción-general)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Módulos Funcionales](#-módulos-funcionales)
4. [Stack Tecnológico](#-stack-tecnológico)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Seguridad](#-seguridad)
7. [Base de Datos](#-base-de-datos)
8. [APIs y Servicios](#-apis-y-servicios)
9. [Guía de Desarrollo](#-guía-de-desarrollo)

---

## 🎯 Descripción General

**NutriKallpa** es una aplicación web completa diseñada específicamente para **nutricionistas y profesionales de la salud** en Perú y Latinoamérica. El sistema permite:

- Gestión integral de pacientes con expediente digital completo
- Evaluaciones antropométricas avanzadas bajo protocolo ISAK
- Cálculos científicos de composición corporal
- Generación automática de planes nutricionales personalizados
- Visualización 3D del cuerpo humano
- Generación de reportes PDF profesionales

### Público Objetivo
- Nutricionistas clínicos
- Nutricionistas deportivos
- Médicos especialistas en nutrición
- Estudiantes de nutrición (con supervisión)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │ Dashboard │  │ Pacientes │  │Antropometr│  │   Dietas  │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │   Agenda  │  │  Settings │  │   Admin   │  │   Auth    │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                     STATE MANAGEMENT (Zustand)                   │
│  useAuthStore | usePatientStore | useAnthropometryStore | etc   │
├─────────────────────────────────────────────────────────────────┤
│                      SERVER ACTIONS (Next.js)                    │
│           patient-actions | auth-actions | diet-actions          │
├─────────────────────────────────────────────────────────────────┤
│                        BACKEND (Supabase)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │    Auth    │  │ PostgreSQL │  │  Storage   │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Módulos Funcionales

### 1. 🏠 Dashboard
**Ruta:** `/dashboard`

Panel principal con vista general del nutricionista:
- **Estadísticas rápidas:** Total de pacientes, activos, pendientes
- **Agenda del día:** Próximas citas con horario
- **Metas del mes:** Productividad y objetivos
- **Gráficos de actividad:** Distribución de tiempo por actividad

### 2. 👥 Gestión de Pacientes
**Ruta:** `/pacientes`

CRUD completo con:
- Registro de pacientes con validación
- Expediente digital integral
- Historial de evaluaciones
- Configuración nutricional personalizada
- Patologías y alergias alimentarias
- Exámenes de laboratorio
- Foto de perfil o avatar

**Estados de paciente:**
- `Activo`: Con mediciones y dieta asignada
- `Pendiente`: Sin mediciones o sin dieta
- `Inactivo`: Última visita hace +90 días

### 3. 📏 Antropometría ISAK
**Ruta:** `/antropometria`

Módulo de evaluaciones antropométricas completas:

| Categoría | Mediciones |
|-----------|------------|
| **Pliegues** | Tríceps, Subescapular, Bíceps, Cresta Ilíaca, Supraespinal, Abdominal, Muslo Anterior, Pantorrilla Medial |
| **Perímetros** | Brazo relajado, Brazo contraído, Antebrazo, Tórax, Cintura, Cadera, Muslo, Pantorrilla |
| **Diámetros** | Biacromial, Bicrestal, Húmero, Fémur |
| **Básicas** | Peso, Talla, Talla sentado |

**Cálculos automáticos:**
- Composición corporal 2 componentes (Masa grasa + Masa libre de grasa)
- Fraccionamiento 5 componentes (Kerr): Piel, Adiposo, Muscular, Óseo, Residual
- Somatotipo Heath-Carter (Endomorfia, Mesomorfia, Ectomorfia)
- Clasificación en 13 categorías de somatotipo
- Somatocarta visual (Triángulo de Reuleaux)

### 4. 🥗 Planificación de Dietas
**Ruta:** `/dietas`

Generador inteligente de planes nutricionales:
- **Dietas diarias o semanales**
- **Recetas peruanas** integradas (+100 platos)
- **Distribución de macronutrientes** personalizable
- **Respeta restricciones** y alergias del paciente
- **Garantía de plato balanceado** (proteína + carbohidrato + vegetal)
- **Exportación a PDF** profesional con branding

### 5. 📅 Agenda
**Ruta:** `/agenda`

Gestión de citas:
- Vista diaria/semanal
- Tipos: Consulta, Antropometría, Seguimiento
- Slider de horarios 8:00 - 20:00
- Recordatorios y notificaciones

### 6. ⚙️ Configuración
**Ruta:** `/settings`

- Perfil del nutricionista
- Datos del consultorio
- Logotipo para PDFs
- Preferencias de la aplicación

### 7. 🔐 Administración
**Ruta:** `/admin` (Solo rol admin)

- Gestión de usuarios del sistema
- Códigos de invitación
- Generador de códigos en lote (PDF)
- Estadísticas de uso

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **Framework** | Next.js (App Router + Turbopack) | 16.x |
| **UI Library** | React | 19.x |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **Components** | Radix UI + Shadcn/ui | Latest |
| **State** | Zustand (persist) | Latest |
| **Forms** | React Hook Form + Zod | Latest |
| **Backend** | Supabase (Auth + PostgreSQL) | 2.x |
| **PDF** | jsPDF + jspdf-autotable | 3.x |
| **Charts** | Recharts | 2.x |
| **3D** | React Three Fiber + Three.js | Latest |
| **Animations** | Framer Motion | 11.x |
| **Testing** | Vitest | 1.x |

---

## 📂 Estructura del Proyecto

```
src/
├── app/                          # Rutas Next.js (App Router)
│   ├── (main)/                   # Rutas protegidas (requieren auth)
│   │   ├── admin/                # Panel de administración
│   │   ├── agenda/               # Gestión de citas
│   │   ├── antropometria/        # Evaluaciones antropométricas
│   │   ├── dashboard/            # Panel principal
│   │   ├── dietas/               # Planes nutricionales
│   │   ├── pacientes/            # Gestión de pacientes
│   │   │   ├── nuevo/            # Crear paciente
│   │   │   └── [id]/             # Expediente del paciente
│   │   │       └── editar/       # Editar paciente
│   │   └── settings/             # Configuración
│   ├── api/                      # API Routes
│   │   └── auth/                 # Endpoints de autenticación
│   ├── auth/                     # OAuth callbacks
│   ├── register/                 # Registro de nuevos usuarios
│   └── page.tsx                  # Login page
│
├── actions/                      # Server Actions
│   ├── auth-actions.ts           # Autenticación
│   ├── patient-actions.ts        # CRUD pacientes
│   └── ...
│
├── components/                   # Componentes React
│   ├── antropometria/            # 36 componentes especializados
│   │   ├── EvaluationForm.tsx    # Formulario de evaluación
│   │   ├── SomatotypeChart.tsx   # Somatocarta
│   │   ├── BodyComposition.tsx   # Composición corporal
│   │   ├── Body3DViewer.tsx      # Visor 3D
│   │   └── ...
│   ├── clinical/                 # Evaluaciones clínicas
│   ├── dashboard/                # Widgets del dashboard
│   ├── diet/                     # Componentes de dietas
│   ├── layout/                   # Header, Sidebar, Layout
│   ├── patient/                  # Componentes de paciente
│   └── ui/                       # Componentes base (Shadcn)
│
├── lib/                          # Utilidades y servicios
│   ├── bodyCompositionMath.ts    # Cálculos composición 2C
│   ├── fiveComponentMath.ts      # Fraccionamiento 5C (Kerr)
│   ├── somatotype-utils.ts       # Cálculos de somatotipo
│   ├── calculos-nutricionales.ts # Fórmulas nutricionales
│   ├── diet-generator.ts         # Generador de dietas
│   ├── peruvian-recipes.ts       # Base de recetas
│   ├── DietPDFGenerator.ts       # Generador de PDF
│   ├── supabase.ts               # Cliente Supabase
│   ├── session-utils.ts          # Manejo de sesiones
│   ├── rate-limiter.ts           # Rate limiting
│   └── ...
│
├── store/                        # Estado global (Zustand)
│   ├── useAuthStore.ts           # Autenticación
│   ├── usePatientStore.ts        # Pacientes
│   ├── useAnthropometryStore.ts  # Antropometría
│   └── useNotificationStore.ts   # Notificaciones
│
├── hooks/                        # Custom hooks
│   ├── useInactivityLogout.ts    # Auto-logout por inactividad
│   └── ...
│
├── types/                        # Definiciones TypeScript
│   └── index.ts                  # Tipos globales
│
└── tests/                        # Tests unitarios
    ├── diet-generator.test.ts
    └── ...
```

---

## 🔐 Seguridad

### Autenticación
- **Email/Contraseña**: Hash con bcrypt
- **Google OAuth**: Integración completa
- **Códigos de invitación**: Requeridos para registro

### Sesiones
- **Cookie HttpOnly**: No accesible desde JavaScript
- **Auto-logout**: 30 minutos de inactividad
- **Expiración**: 7 días máximo

### Protecciones
- **Rate Limiting**: Previene ataques de fuerza bruta
- **CSRF**: Protección con SameSite cookies
- **Validación**: Zod en cliente y servidor
- **Sanitización**: Inputs validados

### Middleware
```typescript
// Rutas protegidas verifican sesión en middleware
if (!sessionCookie && isProtectedRoute) {
  redirect('/login');
}
```

---

## 🗃️ Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Nutricionistas registrados |
| `pacientes` | Datos de pacientes |
| `mediciones` | Evaluaciones antropométricas |
| `pliegues_cutaneos` | Mediciones de pliegues |
| `perimetros` | Mediciones de perímetros |
| `diametros` | Mediciones de diámetros |
| `composicion_corporal` | Resultados calculados |
| `dietas` | Planes nutricionales |
| `configuracion_nutricional` | Config por paciente |
| `citas` | Agenda de citas |
| `codigos_invitacion` | Códigos de registro |
| `audit_logs` | Registro de auditoría |

---

## 🔌 APIs y Servicios

### Server Actions (Principales)
```typescript
// patient-actions.ts
createPatient(data)      // Crear paciente
getPatientById(id)       // Obtener paciente
updatePatient(id, data)  // Actualizar paciente
deletePatient(id)        // Eliminar paciente

// auth-actions.ts
loginUser(email, password)
registerUser(data)
validateInvitationCode(code)
```

### API Routes
```
POST /api/auth/logout    # Cerrar sesión
```

---

## 🚀 Guía de Desarrollo

### Instalación
```bash
# Clonar repositorio
git clone <repo-url>
cd nutrikallpa

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Iniciar desarrollo
npm run dev
```

### Variables de Entorno
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=xxx
EMAIL_PASS=xxx
```

### Scripts
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con Turbopack |
| `npm run build` | Build producción |
| `npm run start` | Iniciar producción |
| `npm run lint` | ESLint |
| `npm test` | Tests con Vitest |

### Convenciones de Código
- **Componentes**: PascalCase (`PatientCard.tsx`)
- **Hooks**: camelCase con prefijo `use` (`usePatientData.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Types**: PascalCase interfaces
- **Commits**: Conventional Commits

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.

---

*Documentación generada el 21 de Diciembre de 2024*
