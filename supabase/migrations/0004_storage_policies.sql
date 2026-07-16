-- Políticas de Storage para los buckets privados creados a mano en el dashboard
-- (comprobantes, medidores, documentos). Sin políticas, storage.objects niega
-- todo por defecto: la app no podría subir ni mostrar fotos.
--
-- Subida: solo los roles que registran datos. Lectura: cualquier usuario
-- logueado (transparencia del edificio; los buckets siguen siendo privados
-- hacia afuera, se accede con URLs firmadas).
--
-- Vive como migración (no en schema.sql) porque el esquema `storage` solo
-- existe en Supabase, no en la base de tests.

drop policy if exists "chardin_subir_fotos" on storage.objects;
create policy "chardin_subir_fotos" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('medidores','comprobantes','documentos')
    and public.mi_rol() in ('porteria','tesoreria','admin')
  );

drop policy if exists "chardin_leer_fotos" on storage.objects;
create policy "chardin_leer_fotos" on storage.objects for select to authenticated
  using (bucket_id in ('medidores','comprobantes','documentos'));
