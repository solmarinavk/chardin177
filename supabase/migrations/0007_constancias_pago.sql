-- FASE 3.7 · Constancia de pago del vecino (opcional) + confirmación de tesorería.
--
-- El vecino PUEDE subir la foto de su constancia (yape/transferencia) desde su
-- estado de cuenta; queda "pendiente de confirmar". Tesorería la confirma (crea
-- el pago oficial) o la rechaza. El pago solo es oficial cuando tesorería
-- confirma: la constancia es una ayuda, no reemplaza la confirmación.

create table if not exists constancias_pago (
  id bigint generated always as identity primary key,
  periodo_id bigint not null references periodos(id),
  dpto_id smallint not null references departamentos(id),
  monto_cent integer check (monto_cent is null or monto_cent > 0),
  foto_url text,
  nota text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmada','rechazada')),
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now(),
  resuelto_por uuid references auth.users(id),
  resuelto_en timestamptz,
  pago_id bigint references pagos(id)
);

alter table constancias_pago enable row level security;

-- El residente ve las suyas; tesorería/admin ven todas.
drop policy if exists sel_constancias on constancias_pago;
create policy sel_constancias on constancias_pago for select to authenticated
  using (creado_por = auth.uid() or mi_rol() in ('tesoreria','admin'));

-- Solo puede insertar una constancia atribuida a sí mismo (residente/tesorería/admin).
drop policy if exists ins_constancias on constancias_pago;
create policy ins_constancias on constancias_pago for insert to authenticated
  with check (creado_por = auth.uid() and mi_rol() in ('residente','tesoreria','admin'));

-- Confirmar/rechazar: solo tesorería/admin.
drop policy if exists upd_constancias on constancias_pago;
create policy upd_constancias on constancias_pago for update to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));

drop trigger if exists tg_audit_constancias on constancias_pago;
create trigger tg_audit_constancias after insert or update or delete on constancias_pago
  for each row execute function fn_audit();

-- Storage: el residente ahora también puede SUBIR al bucket de comprobantes
-- (su constancia). Los otros buckets siguen restringidos.
drop policy if exists "chardin_subir_fotos" on storage.objects;
create policy "chardin_subir_fotos" on storage.objects for insert to authenticated
  with check (
    (bucket_id in ('medidores','comprobantes','documentos')
     and public.mi_rol() in ('porteria','tesoreria','admin'))
    or (bucket_id = 'comprobantes' and public.mi_rol() = 'residente')
  );
