# 🍎 NutriKallpa

> **Software de Gestión Nutricional de Grado Profesional**  
> Alta precisión científica, diseño premium y ecosistema inteligente para nutricionistas.

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind 4](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

---

## 💎 Propuesta de Valor

**NutriKallpa** no es solo un gestor de pacientes; es un laboratorio
nutricional digital diseñado para profesionales que buscan excelencia técnica
y una experiencia de usuario superior. Construido con tecnología de
vanguardia, ofrece precisión matemática en evaluaciones antropométricas y una
automatización inteligente en la creación de dietas.

---

## 🛠️ Módulos de Especialidad

### 📏 Antropometría Avanzada (Protocolo ISAK)

Módulo líder en cálculos cinemantropométricos:

- **Fraccionamiento 5 Componentes (Kerr)**: División exacta de masa dérmica,
  adiposa, muscular, ósea y residual.
- **Composición 2 Componentes**: Algoritmos avanzados (Durnin, Jackson-Pollock,
  Siri, Brozek).
- **Somatocarta Visual**: Clasificación Heath-Carter con representación gráfica
  2D dinámica.
- **Visualizador 3D**: Representación tridimensional del esquema corporal para
  educación del paciente.

### 👶 Nutrición Pediátrica y Adolescente

Integración completa con estándares internacionales:

- **Curvas OMS**: Gráficos dinámicos de Z-Score (Peso/Edad, Talla/Edad, IMC/Edad).
- **Ajuste de Prematuridad**: Cálculos precisos para pacientes neonatos.
- **Maduración Biológica**: Evaluación de estadios de Tanner.

### 👴 Nutrición Geriátrica

Especializado en el cuidado del adulto mayor:

- **Mini Nutritional Assessment (MNA-SF)**.
- **Fórmulas de Estimación**: Chumlea y Rabito para pacientes encamados o con
  movilidad reducida.
- **Gestión de Amputaciones**: Ajustes automáticos para evaluaciones precisas.

### 🥗 Generador de Dietas Inteligente

- **Recetario Local**: +150 platos peruanos y latinoamericanos validados
  nutricionalmente.
- **Validación Clínica**: Sistema de alertas automáticas para alergias e
  interacciones patología-alimento.
- **Cálculo de Requerimientos**: Mifflin-St. Jeor, Harris-Benedict, Cunningham
  y Katch-McArdle.

---

## 🚀 Experiencia de Usuario (Premium UI/UX)

- **Diseño Moderno**: Interfaz con efectos de glassmorphism, gradientes suaves
  y micro-animaciones fluidas.
- **Gamificación**: Sistema de logros y rachas para incentivar el cumplimiento
  de metas de los pacientes.
- **Reportes Profesionales**: Exportación a PDF con diseño editorial de alta
  calidad.
- **Seguridad Robusta**: Login OAuth, auto-logout de 30 min y cifrado de datos
  sensibles.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Arquitectura** | Next.js 16 (App Router + Turbopack) |
| **Lenguaje** | TypeScript + Zod (Strict Type Validation) |
| **Estilos** | CSS Moderno + Tailwind 4 + Framer Motion |
| **Base de Datos** | PostgreSQL (vía Supabase) |
| **Estado** | Zustand (Persistent Global Stores) |
| **Gráficos/3D** | Recharts + Three.js + React Three Fiber |

---

## 💻 Desarrollo e Instalación

1. **Clonación del repositorio**:

   ```bash
   git clone https://github.com/idalopban/NutriKallpa.git
   cd NutriKallpa
   ```

2. **Instalación de dependencias**:

   ```bash
   npm install
   ```

3. **Configuración de variables (`.env.local`)**:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key
   ```

4. **Ejecución en modo desarrollo**:

   ```bash
   npm run dev
   ```

---

## 📄 Licencia

Proyecto bajo licencia privada. Desarrollado por **NutriKallpa Dev Team**.
