# 🍎 NutriKallpa

> Sistema de Gestión Nutricional Profesional — Diseñado para nutricionistas y profesionales de la salud en Latinoamérica

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)

---

## 📖 Descripción

**NutriKallpa** es una aplicación web integral que permite a los profesionales de la nutrición gestionar sus consultas de manera eficiente. El sistema ofrece herramientas avanzadas para evaluaciones antropométricas bajo protocolo **ISAK**, cálculos científicos de composición corporal, y generación automática de planes nutricionales personalizados con recetas peruanas.

### 🎯 ¿Para quién es?

- 🏥 Nutricionistas clínicos
- 🏃 Nutricionistas deportivos
- 👨‍⚕️ Médicos especialistas en nutrición
- 👶 Especialistas en nutrición pediátrica
- 👴 Especialistas en nutrición geriátrica

---

## ✨ Características Principales

### 👥 Gestión de Pacientes

- Expediente digital completo
- Historial de evaluaciones y progreso
- Configuración nutricional personalizada
- Registro de patologías y alergias alimentarias
- Exámenes de laboratorio
- Sistema de gamificación (logros y rachas)

### 📏 Antropometría ISAK

| Mediciones | Detalle |
| ---------- | ------- |
| **Pliegues Cutáneos** | Tríceps, Subescapular, Bíceps, Cresta Ilíaca, Supraespinal, Abdominal, Muslo, Pantorrilla |
| **Perímetros** | Brazo, Antebrazo, Tórax, Cintura, Cadera, Muslo, Pantorrilla |
| **Diámetros** | Biacromial, Bicrestal, Húmero, Fémur |
| **Básicas** | Peso, Talla, Talla sentado |

### 🧬 Cálculos Científicos

- **Composición Corporal 2C**: Masa grasa + Masa libre de grasa
- **Fraccionamiento 5 Componentes (Kerr)**: Piel, Adiposo, Muscular, Óseo, Residual
- **Somatotipo Heath-Carter**: Endomorfia, Mesomorfia, Ectomorfia
- **Clasificación**: 13 categorías de somatotipo
- **Somatocarta Visual**: Triángulo de Reuleaux interactivo

### 👶 Evaluación Pediátrica (OMS)

- Percentiles de crecimiento
- Curvas peso/talla/IMC por edad
- Estándares WHO para 0-19 años
- Z-scores automáticos

### 👴 Evaluación Geriátrica

- Índices específicos para adultos mayores
- Evaluación de sarcopenia
- MNA (Mini Nutritional Assessment)

### 🥗 Planificación de Dietas

- Generador inteligente de menús
- +100 recetas peruanas integradas
- Distribución de macronutrientes personalizable
- Respeta restricciones y alergias
- Garantía de plato balanceado (proteína + carbohidrato + vegetal)
- Exportación a PDF profesional

### 📊 Dashboard

- Estadísticas de pacientes
- Agenda del día
- Metas mensuales
- Gráficos de actividad

### 📅 Agenda

- Gestión de citas
- Vista diaria/semanal
- Recordatorios

### 🔐 Seguridad

- Autenticación Email/Contraseña + Google OAuth
- Códigos de invitación para registro
- Auto-logout por inactividad (30 min)
- Rate limiting
- Validación con Zod

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología | Versión |
| --------- | ---------- | ------- |
| **Framework** | Next.js (App Router + Turbopack) | 16.x |
| **Frontend** | React | 19.x |
| **Lenguaje** | TypeScript | 5.x |
| **Estilos** | Tailwind CSS | 4.x |
| **Componentes** | Radix UI + Shadcn/ui | Latest |
| **Estado** | Zustand (persist) | Latest |
| **Formularios** | React Hook Form + Zod | Latest |
| **Backend** | Supabase (Auth + PostgreSQL) | 2.x |
| **PDF** | jsPDF + jspdf-autotable | 3.x |
| **Gráficos** | Recharts | 2.x |
| **3D** | React Three Fiber + Three.js | Latest |
| **Animaciones** | Framer Motion | 11.x |
| **Testing** | Vitest | 1.x |

---

## 📂 Estructura del Proyecto

```text
src/
├── app/                          # Rutas Next.js (App Router)
│   ├── (main)/                   # Rutas protegidas
│   │   ├── admin/                # Panel de administración
│   │   ├── agenda/               # Gestión de citas
│   │   ├── antropometria/        # Evaluaciones antropométricas
│   │   ├── dashboard/            # Panel principal
│   │   ├── dietas/               # Planes nutricionales
│   │   ├── pacientes/            # Gestión de pacientes
│   │   └── settings/             # Configuración
│   ├── api/                      # API Routes
│   ├── auth/                     # OAuth callbacks
│   └── register/                 # Registro de usuarios
│
├── actions/                      # Server Actions
│   ├── auth-actions.ts           # Autenticación
│   ├── patient-actions.ts        # CRUD pacientes
│   └── anthropometry-actions.ts  # Antropometría
│
├── components/                   # Componentes React
│   ├── antropometria/            # 45+ componentes especializados
│   ├── clinical/                 # Evaluaciones clínicas
│   ├── dashboard/                # Widgets del dashboard
│   ├── diet/                     # Componentes de dietas
│   ├── patient/                  # Componentes de paciente
│   ├── pediatrics/               # Componentes pediátricos
│   └── ui/                       # Componentes base (Shadcn)
│
├── lib/                          # Utilidades y servicios
│   ├── bodyCompositionMath.ts    # Cálculos composición 2C
│   ├── fiveComponentMath.ts      # Fraccionamiento 5C (Kerr)
│   ├── somatotype-utils.ts       # Cálculos de somatotipo
│   ├── calculos-nutricionales.ts # Fórmulas nutricionales
│   ├── diet-generator.ts         # Generador de dietas
│   ├── peruvian-recipes.ts       # Base de recetas (+100)
│   ├── clinical-calculations.ts  # Cálculos clínicos
│   ├── growth-standards.ts       # Estándares OMS pediátricos
│   ├── elderly-standards.ts      # Estándares geriátricos
│   ├── gamification-service.ts   # Sistema de logros
│   └── DietPDFGenerator.ts       # Generador de PDF
│
├── store/                        # Estado global (Zustand)
│   ├── useAuthStore.ts           # Autenticación
│   ├── usePatientStore.ts        # Pacientes
│   ├── useAnthropometryStore.ts  # Antropometría
│   └── useNotificationStore.ts   # Notificaciones
│
└── types/                        # Definiciones TypeScript

database/
└── migrations/                   # Migraciones SQL (11 archivos)

public/
├── alimentos.csv                 # Base de datos de alimentos
├── logo.png                      # Logo de la aplicación
└── models/                       # Modelos 3D
```

---

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- npm o pnpm
- Cuenta en Supabase

### Pasos

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd nutrikallpa

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Ejecutar migraciones en Supabase
# Ejecutar los archivos SQL en database/migrations/ en orden

# 5. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## ⚙️ Variables de Entorno

```bash
# Supabase (Requerido)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# PostgREST (Opcional)
POSTGREST_URL=https://your-project.supabase.co/rest/v1
POSTGREST_API_KEY=your-api-key

# Email SMTP (Opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## 📜 Scripts Disponibles

| Comando | Descripción |
| ------- | ----------- |
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | Compilar para producción |
| `npm run start` | Iniciar servidor de producción |
| `npm run lint` | Ejecutar ESLint |
| `npm test` | Ejecutar tests con Vitest |

---

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm test -- --watch

# Tests con cobertura
npm test -- --coverage
```

---

## 🗃️ Base de Datos

### Tablas Principales

| Tabla | Descripción |
| ----- | ----------- |
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

---

## 🌟 Roadmap

- [ ] App móvil (React Native)
- [ ] Integración con dispositivos IoT (básculas inteligentes)
- [ ] Portal del paciente
- [ ] Exportación a Excel
- [ ] Integración con wearables
- [ ] Soporte multi-idioma

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.

---

Desarrollado con ❤️ para la comunidad de nutricionistas de Latinoamérica
