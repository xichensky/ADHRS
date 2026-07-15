# vibeHR — HRS (adhrs) reproduction

A from-scratch reproduction of the **HRS** HR system (platform app-code **`adhrs`**), built from the
`HRS Maintenance Report` spec (28 collections, 46 workflows). This is a custom full-stack web app —
not the original NocoBase deployment — implementing the data model and the core business logic.

**Stack:** Next.js (App Router, single port) · Prisma · SQLite (dev) / **MySQL (prod)** · Tailwind · node-cron.

---

## Quick start (local)

```bash
npm install
cp .env.example .env   # local SQLite config (DATABASE_URL=file:./dev.db)
npm run db:migrate     # create the SQLite DB + tables (prisma/dev.db)
npm run seed           # dictionaries + a sample org/position/employee/legal-entity/contract
npm run dev            # http://localhost:3001
```

Open **http://localhost:3001**. The dashboard shows seeded counts; every section in the sidebar is
a working CRUD screen.

> Port is **3001** (3000/5173 were busy on the dev machine). Change it in `package.json` scripts or
> set `PORT`.

### Useful scripts
| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server on :3001 |
| `npm run db:migrate` | Apply schema changes (`prisma migrate dev`) |
| `npm run db:push` | Push schema without a migration (`prisma db push`) |
| `npm run db:reset` | Drop & re-create the DB, then re-seed |
| `npm run db:studio` | Prisma Studio (GUI over the DB) |
| `npm run seed` | Seed dictionaries + sample end-to-end data |
| `npm run smoke` | Runtime smoke test of key workflows (prechecks, versioning, guards) |

---

## What's reproduced from the report

**Data model — all 28 collections** as Prisma models (names verbatim from the doc):

- **Masters:** `adhrsEmployees`, `adhrsOrganizations`, `adhrsPositions`, `adhrs_legal_entity`,
  `adhrs_hrs_contract_type`, `adhrs_contract`, `adhrs_system_state`
- **Version tables** (Main + Version pattern, `current_version` flag, switched by `effectiveDate`):
  `adhrsEmployeeOrgAssignment`, `adhrsOrganizationVersions`, `adhrsPositionVersions`,
  `adhrs_employee_basic_info`, `adhrs_employee_bank_account`, `adhrs_employee_social_security`
- **Detail tables:** education background, work experience, change record, compensation,
  family member, emergency contact, certificate
- **Junction / mapping tables** (exact names preserved, incl. the doc's `conctract_no` and
  `*_realtion` typos): legal_entity↔contract, the 3 HRS↔CMS UUID mappings, `adhrs_contract_seq`
  (the OT final-approver m2m was folded into `adhrs_employee_org_assignment.payment_final_approvers`)
- **Dictionaries:** country, bank, currency, id_document_type, legal_entity_register_number_type,
  location (tree)

**Key workflows** (`src/lib/`):
- **Code generation** over `adhrs_system_state` (KV): `queryLastCode` / `getCodePrefix` /
  `updateOrInsertLastCode` + `generateOrganizationCode` / `generatePositionCode` /
  `generateEmployeeCode` (prefix + zero-padded increment, dedup vs master, ≤100 retries).
- **Version switching** (`updateAsCurrentVersion` × 5 entities): pick the latest version with
  `effectiveDate ≤ now`, flip `current_version`, sync the master's denormalized name.
- **Pre-checks** (the report's request-interceptors): email/ID/contract-no/register-no uniqueness,
  no-duplicate-`effectiveDate` (bank/social), last-version-delete protection.
- **Triggers** (orchestrators in `src/lib/triggers/`) mirroring the global triggers: create/edit/
  delete version, in single transactions.
- **Contract flow:** `generateContractVariables` (contract_no = `TYPE-YYYYMMDD-NNN` from
  `adhrs_contract_seq`) → `pushHrsContractToCms` (resolve/ensure person/legalEntity/contractType
  UUIDs via the mapping tables, call the CMS adapter, write back `cms_contract_uuid`).
- **Daily schedule** (`src/lib/scheduler`, `src/instrumentation.ts`): node-cron job that, at the UTC
  day boundary, recomputes `current_version` for every entity with a version effective today. There
  is also a **"Run now"** button on the System State page for testing.

**CMS / QIS are external** and unavailable locally → a `StubCmsAdapter` logs and returns deterministic
fake UUIDs behind a `CmsAdapter` interface. Swap in a real HTTP impl in `src/lib/cms.ts` without
touching anything else.

---

## Deploying to MySQL (company server)

The schema is written once and is provider-agnostic. To switch to MySQL:

1. In `prisma/schema.prisma`, change the datasource:
   ```prisma
   datasource db {
     provider = "mysql"          // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to your MySQL connection (see `.env.production.example`):
   ```
   mysql://USER:PASSWORD@HOST:3306/vibehr
   ```
3. Apply the schema on the server:
   ```bash
   npx prisma migrate deploy     # or: npx prisma db push
   npm run build && npm start    # serves on :3001 (or set PORT)
   ```

**Portability choices baked into the schema** (see `prisma/schema.prisma` header):
- IDs/FKs use `Int @default(autoincrement())` (the doc marks everything `bigInt`; Int keeps JSON
  serialization safe across server→client. Switching to BigInt is a one-type change).
- No `@db.*` provider-specific modifiers; `Json` for opaque blobs; UTC datetimes; `deletedAt` for
  soft-delete; codes uppercased / email lowercased in the app layer so unique-constraint behavior
  matches across SQLite (case-sensitive) and MySQL (case-insensitive).

---

## Project layout

```
prisma/
  schema.prisma        # the 28 models — single source of truth
  seed.ts              # dictionaries + sample org/position/employee/contract
  smoke.ts             # runtime smoke test of key workflows
src/
  app/                 # App Router pages (dashboard + CRUD per entity)
    dictionaries/[dict]/   # generic CRUD for the 5 simple dictionaries
    organizations|positions|employees|contracts/   # list / new / [id] + actions.ts
    legal-entities|contract-types|system-state/
  components/          # ui.tsx (primitives + ActionForm), sidebar.tsx
  lib/
    prisma.ts errors.ts datetime.ts types.ts cms.ts
    codegen/           # system_state + org/position/employee generators
    versioning/        # updateAsCurrentVersion × 5 entities
    prechecks/         # uniqueness + version guards
    triggers/          # orchestrators (the "global triggers")
    contract/          # contract_no gen + CMS push + UUID resolution
    scheduler/         # daily version switch (node-cron)
  instrumentation.ts   # registers the cron job at server start
```

---

## Verification checklist

End-to-end (already passing in `npm run smoke`):

- [x] Creating an organization/position/employee generates a unique code (`CNSZ0001`, `L0001`,
      `CNSZ0001`) and persists it to `adhrs_system_state`.
- [x] Creating a contract generates `contract_no` (`FT-20260710-001`) from `adhrs_contract_seq`,
      pushes to the CMS stub, and writes back `cms_contract_uuid`.
- [x] Duplicate email is blocked with `UNIQUE_VIOLATION`.
- [x] A future-dated version does **not** displace the current version (correct `effectiveDate`
      switching); today-dated versions do.
- [x] Deleting the only remaining version is blocked with `LAST_VERSION_PROTECTED`.
- [x] The daily switch logic recomputes `current_version` per entity.
- [x] Schema validates against both `sqlite` and `mysql` providers (no provider-specific artifacts).

Manual: open the app, create an org → a position → an employee → a contract; add a version with a
future date and confirm it isn't current; open **System State → Run now** to trigger the daily switch.

---

## Notes / deviations from the source report

- The original is a NocoBase low-code deployment; this is a clean code reproduction of its **data
  model and behavior**, not its trigger-node wiring.
- Org/position codes are generated once at master creation and are permanent (the report re-runs
  codegen per version, which is not correct HR behavior).
- Contracts are created explicitly (the report auto-creates one when an employee version is created);
  the QIS push is an empty placeholder in the report and is omitted.
- No `users`/auth table in v1 — `createdBy`/`updatedBy` are stored as nullable `Int?`.
- Formula fields (`age`, `country_name_code`) are computed at read time, not stored.
- Select-field option values aren't shipped in the report; sensible defaults live in `src/lib/types.ts`
  and are editable data.
