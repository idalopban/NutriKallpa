-- 1. Create Pacientes Table
create table if not exists public.pacientes (
  id uuid primary key, -- UUID from client or gen_random_uuid()
  usuario_id uuid not null, -- Links to the nutritionist/user
  
  -- Flattened Basic Data
  nombre text not null,
  apellido text not null,
  email text,
  fecha_nacimiento date,
  sexo text,
  documento_identidad text,
  
  -- JSONB for nested/flexible data
  historia_clinica jsonb default '{}'::jsonb,
  preferencias jsonb default '{}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for Pacientes
alter table public.pacientes enable row level security;

create policy "Users can view their own patients"
  on public.pacientes for select
  using (auth.uid() = usuario_id);

create policy "Users can insert their own patients"
  on public.pacientes for insert
  with check (auth.uid() = usuario_id);

create policy "Users can update their own patients"
  on public.pacientes for update
  using (auth.uid() = usuario_id);

create policy "Users can delete their own patients"
  on public.pacientes for delete
  using (auth.uid() = usuario_id);


-- 2. Create Anthropometry Records Table
create table if not exists public.anthropometry_records (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references public.pacientes(id) on delete cascade not null,
  
  -- Basic Data
  weight numeric not null,
  height numeric not null,
  age integer not null,
  
  -- Skinfolds (mm)
  triceps numeric, subscapular numeric, biceps numeric, iliac_crest numeric,
  supraspinale numeric, abdominal numeric, thigh numeric, calf numeric,
  
  -- Girths (cm)
  arm_relaxed numeric, arm_flexed numeric, waist numeric,
  hip numeric, thigh_mid numeric, calf_max numeric,
  
  -- Breadths (cm)
  humerus numeric, femur numeric,
  
  -- Results
  body_fat_percent numeric, muscle_mass_kg numeric,
  somatotype_endo numeric, somatotype_meso numeric, somatotype_ecto numeric,
  
  notes text,
  evaluator_id uuid
);

-- RLS for Anthropometry
alter table public.anthropometry_records enable row level security;

create policy "Users can view records of their patients"
  on public.anthropometry_records for select
  using ( exists (
    select 1 from public.pacientes
    where public.pacientes.id = public.anthropometry_records.patient_id
    and public.pacientes.usuario_id = auth.uid()
  ));

create policy "Users can insert records for their patients"
  on public.anthropometry_records for insert
  with check ( exists (
    select 1 from public.pacientes
    where public.pacientes.id = public.anthropometry_records.patient_id
    and public.pacientes.usuario_id = auth.uid()
  ));

create policy "Users can delete records of their patients"
  on public.anthropometry_records for delete
  using ( exists (
    select 1 from public.pacientes
    where public.pacientes.id = public.anthropometry_records.patient_id
    and public.pacientes.usuario_id = auth.uid()
  ));
