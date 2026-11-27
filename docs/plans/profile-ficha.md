# Plan: ficha ampliada del usuario

Fuente de verdad del trabajo. Una fase por sesión; marcar al terminar.

## Decidido

- La ficha existe para cualquier rol. Habilidades y capacitaciones son opcionales. Crear proyectos
  no exige testimonio por ahora.
- Visible solo para su dueño, admin y validadores (excepción: lo que publica el pin).
- Dos verificaciones: testimonio y habilidades espirituales. El dueño puede editar; al cambiar queda
  "pendiente de nueva validación" (avisar antes de guardar). Ve el estado, nunca lo modifica.
- Nadie se valida a sí mismo, tampoco un creador. El validador ve la ficha completa, respaldos incluidos.
- Hasta 5 respaldos, cada uno con teléfono o correo; cambiarlos no quita verificaciones.
- Testimonio en un solo idioma, como se escriba.
- Habilidades y capacitaciones salen solo del catálogo; capacitación sin año.
- Pin del usuario: opt-in; solo visible si está validado por el admin. Es de tipo persona o familia.
  Muestra nombre de pila y el testimonio como descripción. Sin categorías nuevas.
- Admin filtra usuarios por habilidad, capacitación, país y verificación.
- Multi-rol, sin permisos directos. Permisos efectivos = unión de los roles.
- Los roles se gestionan desde admin: crear roles y cambiar sus permisos. `validator` podrá recibir más
  permisos en el futuro.
- Cualquier cuenta con rol `admin` puede gestionar roles (sin cuenta propietaria).
- Solo `admin` crea, edita y asigna roles y sus permisos, y aprueba solicitudes de rol. No es un permiso
  asignable; `users.manage` en otro rol no permite tocar roles ni cuentas admin.
- Solicitud de ascenso: el usuario pide con un mensaje un rol marcado "solicitable" (de inicio `creator`);
  una pendiente a la vez.
- Tipo de ficha: "Participo como: persona / familia" (por defecto persona); da el tipo del pin, que no se
  edita en el pin. Iglesia y casa iglesia siguen por la solicitud de pin normal.
- El pin del usuario se ve solo si: opt-in, testimonio validado vigente, pin aprobado por admin y cuenta no
  bloqueada. Editar el testimonio lo oculta hasta revalidar.

## Al crecer la aplicación

Cada función nueva trae en su migración sus permisos (`seccion.accion`, con nombre y descripción es/en), sus
reglas con `has_permission` y su pestaña ligada al permiso. Desde admin se asignan a los roles que se quiera,
sin tocar código.


## Roles

| Rol | Permisos de inicio | Reglas |
| --- | --- | --- |
| `subscriber` | `projects.view_detail`, `projects.save`, `messages.send`, `pins.request` | base de todos; editable; no se quita ni borra |
| `creator` | `projects.create`, `projects.update_own` | editable; solicitable |
| `validator` | `profiles.read_all`, `profiles.verify` | editable |
| `admin` | todos (implícito) | no se edita ni borra; siempre queda al menos uno |
| nuevos | los que elija el admin | se borran solo sin usuarios asignados |

Permisos asignables: los actuales (`projects.*`, `pins.request`, `pins.write`, `pins.approve`, `messages.send`,
`messages.moderate`, `users.manage`) y los nuevos `profiles.read_all`, `profiles.verify`, `profiles.edit_any`,
`catalogs.manage`. El catálogo de permisos solo crece por migración; cada uno con nombre y descripción es/en.

## Modelo de datos (todo en la fase 1)

| Tabla | Campos principales | Escribe |
| --- | --- | --- |
| `permissions` | `key`, `description` | solo migraciones |
| `roles` | `id`, `name_es`, `name_en`, `system`, `requestable` | admin, RPC |
| `role_permissions`, `user_roles` (existentes) | FK a las anteriores, en vez de `check` | admin, RPC |
| `role_requests` | `user_id`, `role`, `message`, `status`, `reviewed_by/at` | dueño crea; revisa RPC |
| `profile_details` | `user_id`, `household`, `testimony` (≤2000), `testimony_updated_at`, `spiritual_skills_updated_at`, `home_country`, `home_description` (≤500), `show_on_map` | dueño, admin |
| `skills` | `category` (`manual`/`spiritual`), `name_es`, `name_en`, `active`, `position` | `catalogs.manage` |
| `trainings` | `name`, `active`, `position` | `catalogs.manage` |
| `user_skills`, `user_trainings` | usuario + id del catálogo | solo RPC |
| `profile_backers` | `kind` (`ministry`/`church`/`pastor`/`person`/`other`), `name`, `phone`, `email` | dueño, admin |
| `profile_verifications` | `user_id`, `subject` (`testimony`/`spiritual_skills`), `verified_by/at`, `invalidated_at` | solo RPC y triggers |
| `pins`, `pin_requests` (existentes) | nuevo `profile_user_id` (un pin por usuario) | flujo de solicitudes |

Reglas:

- `admin_set_user_role` pasa a recibir la lista de roles; conserva `subscriber`; nadie cambia los propios.
- Nada depende del nombre del rol salvo `admin`: `is_creator` y la lista de contactos de `ProjectEditor`
  pasan a preguntar por permiso (`projects.create`).
- El panel admin se muestra por permiso, pestaña por pestaña (hoy depende de `users.manage`).
- `set_user_skills(target, category, ids)` y `set_user_trainings(target, ids)`: aplican solo diferencias.
- Triggers: cambiar testimonio o habilidades espirituales pone `invalidated_at`.
- `verify_profile(target, subject, verified, seen_updated_at)`: rechaza al propio usuario y si el contenido
  cambió desde que se leyó.
- Catálogos: se desactivan, no se borran si están en uso.
- Pin del usuario: va por `pin_requests`; aprobar crea o actualiza el mismo pin (conserva conversaciones),
  con el usuario como contacto (tiene botón de mensaje). Título = nombre de pila; descripción = testimonio
  validado; mismo difuminado (300-900 m). La visibilidad se impone en la política de lectura de `pins`.
- Mover el punto requiere nueva aprobación; quitar el opt-in oculta al instante. El desplazamiento aleatorio
  solo se recalcula si el punto se mueve más de 1 km.
- Auditoría: triggers sobre todas las tablas nuevas.
- Semillas: electricista, plomería, carpintería; enseñar, predicar, bautizar, discipular;
  TLR Luke 10 School, PTS School, CFTN.

## Interfaz

- Componentes en `src/components/profile/`, una tarjeta por bloque, cada una recibe `userId` y guarda sola:
  tipo y testimonio, origen, habilidades, capacitación, respaldos, ubicación actual (mapa, idiomas, opt-in),
  estado de verificación. Los usan usuario, admin y el alta propia futura.
- Usuario: `#/cuenta/ficha`; solicitar ser creador desde su cuenta.
- Admin: `#/admin/roles` (lista, alta y permisos por casillas), `#/admin/usuarios/<id>`, `#/admin/catalogos`, `#/admin/validaciones`; solicitudes de rol y de pin en
  `#/admin/solicitudes`. Roles como casillas en Usuarios y en el alta.
- Cada quien ve solo las pestañas que sus permisos permiten.
- Alta por admin: al crear ofrece "Completar ficha".
- Textos es/en; países con `countries.ts`.

## Fases

- [ ] **0. Preparación.** Rama `feature/ficha`, tag `v0-baseline`, Supabase local (Docker).
- [ ] **1. Base de datos.** Todo el modelo. Script SQL que prueba el acceso por rol (anónimo, dueño, otro,
      validador, admin). Listo: `db reset` limpio y script en verde.
- [ ] **2. Roles.** Editor de roles, pestañas por permiso, multi-rol en Usuarios y alta (`admin-create-user`,
      requiere desplegarla), solicitud de rol.
- [ ] **3. Ficha.** Servicios y tarjetas (sin ubicación); usuario y admin. Verificación solo lectura y aviso al editar.
- [ ] **4. Catálogos.** Alta, edición, orden, desactivar.
- [ ] **5. Verificación.** Botones, pendientes y chip.
- [ ] **6. Pin del usuario.** Tarjeta de ubicación, aprobación y mapa.
- [ ] **7. Filtros en Usuarios.**
- [ ] **Aparte.** Alta propia (registro público y SMTP).

Cada fase termina con `npx tsc -b`, `npm run lint`, `npm test` en verde, textos es/en y auditoría con etiqueta.

## Para gastar menos

- Sesión nueva por fase: "Lee `docs/plans/profile-ficha.md` y haz la fase N".
- Cambios de alcance antes de la fase 1.
- Juntar los ajustes visuales y pedirlos de una vez al cerrar cada fase.
