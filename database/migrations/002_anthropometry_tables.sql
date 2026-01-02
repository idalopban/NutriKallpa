-- Create Anthropometry Records Table
-- Stores historical anthropometric evaluations
create table if not exists public.anthropometry_records (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  patient_id uuid references public.pacientes(id) on delete cascade not null,
  
  -- Basic Data (Snapshot)
  weight numeric not null, -- kg
  height numeric not null, -- cm
  age integer not null,
  
  -- Skinfolds (mm)
  triceps numeric,
  subscapular numeric,
  biceps numeric,
  iliac_crest numeric,
  supraspinale numeric,
  abdominal numeric,
  thigh numeric,
  calf numeric,
  
  -- Girths (cm)
  arm_relaxed numeric,
  arm_flexed numeric,
  waist numeric,
  hip numeric, -- cadera
  thigh_mid numeric, -- muslo medio
  calf_max numeric, -- pantorrilla
  
  -- Breadths (cm)
  humerus numeric,
  femur numeric,
  
  -- Calculated Results (Snapshot for quick access)
  body_fat_percent numeric,
  muscle_mass_kg numeric,
  somatotype_endo numeric,
  somatotype_meso numeric,
  somatotype_ecto numeric,
  
  -- Metadata
  notes text,
  evaluator_id uuid -- future proofing
);

-- RLS Policies
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
