-- 0010 · Cuaderno de ocurrencias de portería (Fase 6)
--
-- El portero (y tesorería/admin) registran eventos del edificio (mantenimiento
-- del montavehículo/ascensor, incidencias, entregas, seguridad) con fotos de
-- evidencia. Es un registro INTERNO: las evidencias incluyen datos de terceros
-- (p. ej. el DNI del técnico), así que el rol anon (público) NUNCA lo ve —
-- estas tablas no entran en las listas de transparencia.
--
-- Idempotente: se puede correr más de una vez sin romper nada.

create table if not exists ocurrencias (
  id bigint generated always as identity primary key,
  fecha date not null default (now() at time zone 'America/Lima')::date,
  categoria text not null default 'general',
  titulo text not null,
  detalle text,
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now()
);
create index if not exists ix_ocurrencias_fecha on ocurrencias (fecha desc, id desc);

create table if not exists ocurrencia_fotos (
  id bigint generated always as identity primary key,
  ocurrencia_id bigint not null references ocurrencias(id) on delete cascade,
  ruta text not null,
  creado_en timestamptz not null default now()
);
create index if not exists ix_ocurrencia_fotos_oc on ocurrencia_fotos (ocurrencia_id);

alter table ocurrencias enable row level security;
alter table ocurrencia_fotos enable row level security;

-- Solo el personal (portería/tesorería/admin) lee y escribe. anon: NADA.
drop policy if exists sel_ocurrencias on ocurrencias;
create policy sel_ocurrencias on ocurrencias for select to authenticated
  using (mi_rol() in ('porteria','tesoreria','admin'));
drop policy if exists w_ocurrencias on ocurrencias;
create policy w_ocurrencias on ocurrencias for all to authenticated
  using (mi_rol() in ('porteria','tesoreria','admin'))
  with check (mi_rol() in ('porteria','tesoreria','admin'));

drop policy if exists sel_ocurrencia_fotos on ocurrencia_fotos;
create policy sel_ocurrencia_fotos on ocurrencia_fotos for select to authenticated
  using (mi_rol() in ('porteria','tesoreria','admin'));
drop policy if exists w_ocurrencia_fotos on ocurrencia_fotos;
create policy w_ocurrencia_fotos on ocurrencia_fotos for all to authenticated
  using (mi_rol() in ('porteria','tesoreria','admin'))
  with check (mi_rol() in ('porteria','tesoreria','admin'));

-- ---------- Storage: bucket privado para las fotos de evidencia ----------
-- (El esquema `storage` solo existe en Supabase, no en la base de tests.)
insert into storage.buckets (id, name, public)
values ('ocurrencias', 'ocurrencias', false)
on conflict (id) do nothing;

drop policy if exists "ocurrencias_subir" on storage.objects;
create policy "ocurrencias_subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'ocurrencias' and public.mi_rol() in ('porteria','tesoreria','admin'));

drop policy if exists "ocurrencias_leer" on storage.objects;
create policy "ocurrencias_leer" on storage.objects for select to authenticated
  using (bucket_id = 'ocurrencias' and public.mi_rol() in ('porteria','tesoreria','admin'));
