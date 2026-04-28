# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Factufy Hotel** is a hotel-focused POS: room management, reservations, check-in/out, guest registration, room charges, integrated billing, electronic invoicing (DIAN/Factus), and TRA (MinCIT) reporting.

- **Database:** `factufy_hotel` (PostgreSQL 14+)
- **Backend port:** `4005` (Apollo Server + Express, GraphQL at `/graphql`)
- **Frontend port:** `3005` (Vite dev server, proxies `/graphql` and `/api` to `4005`)
- **Package manager:** `pnpm` (both apps have `pnpm-lock.yaml`; `bcrypt` and `esbuild` are listed in `onlyBuiltDependencies`)

> **Heads-up on folder naming:** the frontend lives in [fronted/](fronted/) (typo, not `frontend/`). All paths below use the real directory names.

## Repository layout

```
Factufy-Hotel/
├── backend/                              # Apollo + Express (Node 18+)
│   ├── src/
│   │   ├── server.js                     # Entry point; permissions cache; REST endpoints
│   │   ├── config/database.js            # pg Pool (max=20, UTF8)
│   │   ├── schema/typeDefs.js            # Single GraphQL schema
│   │   ├── resolvers/                    # Domain resolvers, aggregated by index.js
│   │   ├── routes/cola-impresion.js      # REST endpoints for the print agent
│   │   ├── services/                     # FactusService, TRAService, cola-impresion
│   │   └── data/municipios-dane.json     # DANE/DIVIPOLA municipios (singleton loader)
│   ├── database/
│   │   ├── schema_hotel.sql              # Initial schema
│   │   ├── seeds_*.sql                   # Test data
│   │   ├── migrations/                   # 53 numbered SQL migrations
│   │   └── run-migrations.js             # Runs a hardcoded subset (007–012 config)
│   └── scripts/                          # Operational scripts (see backend/scripts/README.md)
│       ├── diagnostico/  factus/  fixes/  migrations/  tests/  utils/
│
├── fronted/                              # React 18 + Vite 5
│   └── src/
│       ├── App.jsx                       # Router (most routes commented for Sprint 2)
│       ├── apolloClient.js               # Apollo Client with auth + error links
│       ├── contexts/                     # ThemeContext (light/dark), NotificationContext
│       ├── components/                   # Layout, Sidebar, PrivateRoute, ModuloRoute, shared/
│       ├── pages/                        # Dashboard, Habitaciones, Reservas, POS, etc.
│       ├── graphql/                      # gql operations, one file per domain
│       ├── hooks/                        # usePermisos, useModuloHabilitado, useConfirmation
│       └── config/hotel.config.js        # Theme + interface ID = 'hotel'
│
└── factufy-agente-impresion-hotel/       # Standalone Windows service (separate Node app)
    └── index.js                          # Polls backend's /api/cola endpoints, prints ESC/POS
```

## Development commands

### Backend (`backend/`)
```bash
pnpm install
pnpm run dev          # nodemon, watches src/, port 4005
pnpm start            # production
pnpm test             # jest (no test files yet — runner only)
node scripts/utils/kill-port.js   # kills whatever holds port 4003 (legacy — edit if needed)
```

### Frontend (`fronted/`)
```bash
pnpm install
pnpm run dev          # Vite, port 3005, opens browser, proxies /graphql + /api → :4005
pnpm run build        # → dist/
pnpm run preview
pnpm run lint         # ESLint, --max-warnings 0
```

### Database (Windows-style paths)
```bash
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -f backend/database/schema_hotel.sql
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d factufy_hotel -f backend/database/seeds_inventario.sql

# Apply a single migration
"C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d factufy_hotel -f backend/database/migrations/030_sistema_permisos.sql

# Apply the configuration migration set (007–012)
node backend/database/run-migrations.js

# Remote production DB
PGPASSWORD=<password> psql -h remoto.pronetsys.com.co -U postgres -d factufy-hotel
```

### Print agent (`factufy-agente-impresion-hotel/`)
Standalone Windows service that polls the backend's print queue. Run `pnpm run dev` for local testing or `pnpm run install-service` (as Administrator) to install it as a Windows service. Web panel at `http://localhost:3050`.

## Architecture

### GraphQL composition
- Single schema in [backend/src/schema/typeDefs.js](backend/src/schema/typeDefs.js).
- Resolvers are split per domain and **aggregated** in [backend/src/resolvers/index.js](backend/src/resolvers/index.js) by spreading each module's `Query`, `Mutation`, and type resolvers into one object. When adding a domain, both spread its `Query`/`Mutation` and (if applicable) its nested type resolvers (e.g. `Hospedaje`, `Cliente`).
- The `Factura` type composes resolvers from `facturacionResolvers.Factura` plus inline overrides for `impuestos`, `tiene_factura_electronica`, and `factura_electronica`.
- **Removed (do not reintroduce without checking with maintainers):** `factubox.js` and `licencia.js` resolvers exist on disk but are intentionally commented out in `resolvers/index.js` ("proyecto universitario").

### Auth + permissions (important)
[backend/src/server.js](backend/src/server.js) builds the GraphQL `context` for every request:

```js
context = { user, pool, permisos, tienePermiso, invalidarCachePermisos }
```

- `user`: decoded JWT (`id`, `usuario`, `rol`) from `Authorization: Bearer <token>`. JWT secret defaults to `'default_secret_key'` if `JWT_SECRET` is unset — set it in `.env`.
- `permisos`: array of permission codes loaded by SQL function `obtener_permisos_usuario(user_id)`. Cached in-process for 5 minutes per user. Admins skip the lookup.
- `tienePermiso(codigo)`: returns `true` for `rol === 'admin'`, otherwise checks the cached array.
- After mutating role/user permissions, call `invalidarCachePermisos(userId)` (also exposed as `global.invalidarCachePermisos`) to flush the cache.

Frontend mirrors this with [usePermisos](fronted/src/hooks/usePermisos.js) and a `<PermisoGuard>` component in `components/shared/`. The permissions migration is [030_sistema_permisos.sql](backend/database/migrations/030_sistema_permisos.sql).

### REST endpoints (alongside GraphQL)
The Express server also exposes:
- `GET /health` — service health check
- `GET /api/descargar-pdf?tipo=factura|nota-credito&numero=...` — proxies Factus PDF download
- `GET /api/descargar-xml?...` — proxies Factus XML download
- `GET /api/descargar-zip?...` — bundles PDF+XML using `archiver`
- `/api/cola/*` ([backend/src/routes/cola-impresion.js](backend/src/routes/cola-impresion.js)) — endpoints consumed by the print agent (pendientes, marcar-procesando, marcar-completado, etc.)

Factus auth (`getFactusAuth`) reads from the `configuracion_factus` table and uses `FactusService.getAuthToken()` for OAuth2.

### Frontend routing state
[fronted/src/App.jsx](fronted/src/App.jsx) currently has **most routes commented out for Sprint 2**. Only `/dashboard` and `/habitaciones` are active. Other modules (Reservas, Hospedajes, CheckIn, Huéspedes, Clientes, POS, Caja, Facturación, Configuración) are imported and ready — uncomment as features are presented. Don't delete the imports; they're intentional placeholders.

### Apollo Client behavior
- API URL from `VITE_API_URL`, defaults to `http://localhost:4005/graphql`.
- Token stored in `localStorage.token`, attached via `setContext` link.
- On any GraphQL error containing `"No autenticado"` or `"Token"`, the error link wipes the token and redirects to `/login`.
- Default policies: `cache-and-network` for `watchQuery`, `network-only` for `query`, `errorPolicy: 'all'` everywhere.

### Theme + notifications
- [ThemeContext](fronted/src/contexts/ThemeContext.jsx) writes `data-theme="light|dark"` on `<html>` and persists in `localStorage.factufy_theme`. CSS uses `var(--hotel-*)` variables that respond to that attribute.
- [NotificationContext](fronted/src/contexts/NotificationContext.jsx) plus `react-hot-toast` (Toaster mounted in `App.jsx`).

## Domain model

### Room states (`estado` on `habitaciones`)
`disponible` · `ocupada` · `limpieza` · `mantenimiento` · `reservada`

State transitions are partly automated by triggers (`actualizar_estado_habitacion_checkin`, etc.). Manual `cambiarEstadoHabitacion` mutations exist but should respect active hospedajes.

### Core flows
1. **Reservation:** `Cliente → Huesped → Reserva (with anticipo) → Check-in → Hospedaje`
2. **Walk-in:** `Cliente → Huesped → Check-in → Hospedaje` (no reserva)
3. **Charges:** `Hospedaje → Consumos` (accumulate; `facturado=false` until checkout)
4. **Check-out:** total = `noches_reales × precio_noche + Σ consumos.precio_total` → `Factura` → room state `limpieza` → `hospedaje.estado='finalizado'` → consumos marked `facturado=true`

### Auto-generated codes (DB triggers)
- `RES-YYYYMMDD-0001` — reservas (`generar_codigo_reserva`)
- `HOS-YYYYMMDD-0001` — hospedajes (`generar_codigo_hospedaje`)

### Shared vs hotel-specific tables
Factufy Hotel is one of several POS interfaces. Shared with other interfaces: `clientes`, `facturas`, `metodos_pago`, `factura_metodos_pago`, `facturas_electronicas`, `notas_credito`. Hotel-specific: `habitaciones`, `huespedes`, `reservas`, `hospedajes`, `servicios_hotel`, `consumos_habitacion`. The `'hotel'` interface ID is set in [hotel.config.js](fronted/src/config/hotel.config.js).

### Inventory unification
The `items` table holds **both products and services** (`es_servicio` flag). `servicios_hotel` is legacy (migrated by `003_migrar_servicios.sql`). New code should query `items` and use `categorias` + `movimientos_inventario` for stock history.

### Localization
- Timezone: `America/Bogota`. Always confirm date display matches.
- Money fields: `DECIMAL(10,2)`. Watch rounding in client-side calculations.
- JSONB fields: `comodidades` (habitaciones), `acompañantes` (hospedajes), `preferencias` (huespedes).
- Soft-delete: use `activo` flag on `usuarios`, `habitaciones`, `clientes`. Do not `DELETE`.

## Active modules

### Electronic invoicing (Facturación Electrónica)
- Resolver: [facturacion.js](backend/src/resolvers/facturacion.js). Frontend pages under [Facturacion.jsx](fronted/src/pages/Facturacion.jsx).
- Tables: `facturas_electronicas` (CUFE, estado_dian, url_pdf/xml), `notas_credito`.
- Transmission via [FactusService](backend/src/services/FactusService.js) (OAuth2 → `configuracion_factus.endpoint`, default sandbox `https://api-sandbox.factus.com.co`).
- DB triggers in `012_trigger_facturas_electronicas.sql` and `014_mejorar_trigger_factura_electronica.sql` automatically create the `facturas_electronicas` row when a `factura` is inserted; `041_transmision_automatica.sql` enables automatic transmission.
- The legacy "FactuBox" UI/resolver was removed; do not re-add without explicit instruction.

### TRA — Tarjeta de Registro de Alojamiento (MinCIT)
- Resolver: [tra.js](backend/src/resolvers/tra.js). Service: [TRAService.js](backend/src/services/TRAService.js).
- Implements **Resolución 409 de 2022**: `POST /one/` for huésped principal, `POST /two/` for acompañantes (uses `padre` field). Auth header is `Authorization: token <token>`.
- Each hotel-tenant configures its own RNT + token in `configuracion_tra` (single row, `id=1`). Reports stored in `reportes_tra`. Migrations 050–055.
- Hospedaje and huesped tables have TRA fields (`054_*`, `052_*`, `053_*`).

### POS + Caja
- Tables: `ventas_pos`, `detalle_venta_pos`, `caja_pos` (turno), `movimientos_caja`, `arqueo_caja`. Migration `020_create_pos_system.sql`.
- Workflow: open turno (with monto inicial) → ventas → close turno (cuadre).

### Print queue (Impresoras + Cola de impresión)
- DB table `cola_impresion` (migration `021`), printer config in `impresoras` (migration `036`).
- Backend exposes REST under `/api/cola/*` (no GraphQL; the agent is unauthenticated by design — protect via network or add auth before going public).
- The Windows agent in `factufy-agente-impresion-hotel/` polls those endpoints and prints to local ESC/POS thermal printers.

### Calendar
Unified events resolver in [calendario.js](backend/src/resolvers/calendario.js) returns `CalendarioEvento` objects merging reservas + hospedajes for calendar views.

### Permissions module
See "Auth + permissions" above. Module resolver: [permisos.js](backend/src/resolvers/permisos.js). Effective permissions = (rol's permisos) ∪ (user-added) − (user-removed).

## Environment variables

### `backend/.env`
```
PORT=4005
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=factufy_hotel
DB_USER=postgres
DB_PASSWORD=<your_password>
JWT_SECRET=<set this — defaults to 'default_secret_key' which is insecure>
```

### `fronted/.env`
```
VITE_API_URL=http://localhost:4005/graphql
VITE_APP_NAME=Factufy Hotel
```

## Theme

Purple/violet identifies the hotel interface:
- Primary `#8b5cf6`, Hover `#7c3aed`
- Header gradient: `linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)`

Room state colors (used in `Habitaciones` UI and shared `Badge`):
- Disponible: `#d1fae5` / `#10b981`
- Ocupada: `#fee2e2` / `#ef4444`
- Limpieza: `#fef3c7` / `#f59e0b`
- Mantenimiento: `#e5e7eb` / `#6b7280`
- Reservada: `#dbeafe` / `#3b82f6`

CSS variables live in `fronted/src/index.css` (global Factufy) and `fronted/src/config/hotel.config.js` (hotel-specific overrides). Components use BEM-ish naming with co-located `.css`.

## Test credentials

Seeded admin: `admin` / `admin123` (bcrypt hashed).

## Pitfalls + conventions

- **Folder name `fronted/`** is intentional in this repo. Don't `mv` it without coordinating.
- **Routes are gated:** when adding a new feature, also uncomment its `<Route>` in `App.jsx` and the matching `<NavLink>` in `Sidebar.jsx`.
- **Permission cache:** mutations that change `usuarios.rol` or rol/usuario permissions must call `invalidarCachePermisos(userId)` or the user keeps stale permissions for up to 5 minutes.
- **Triggers handle most state:** prefer letting DB triggers compute `saldo_pendiente`, `noches_reales`, `precio_total` on consumos, and room-state on check-in. Don't duplicate that logic in resolvers.
- **N+1 watch:** nested resolvers (`Habitacion.hospedaje_actual`, `Hospedaje.consumos`, `Cliente.tipo_documento_dian`) run per-row. For list endpoints, prefer SQL JOINs in the parent query.
- **Spanish domain, English code:** keep field names like `habitacion`, `huesped`, `reserva` — they're load-bearing across SQL, GraphQL, and UI strings.
- **Parameterized queries only** (always `pool.query(sql, [params])`) — schemas accept user-supplied search strings.
