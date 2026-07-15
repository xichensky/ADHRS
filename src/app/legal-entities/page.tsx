import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, ActionForm, Field, Input, Select } from "@/components/ui";
import { createLegalEntityAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LegalEntitiesPage() {
  const [entities, countries, regTypes] = await Promise.all([
    prisma.adhrs_legal_entity.findMany({ where: { deletedAt: null }, orderBy: { entity_name: "asc" } }),
    prisma.country.findMany({ where: { deletedAt: null }, orderBy: { country_name: "asc" } }),
    prisma.legal_entity_register_number_type.findMany({ where: { deletedAt: null } }),
  ]);

  return (
    <div>
      <PageHeader title="Legal entities" subtitle="Contract signing parties. Register number must be unique." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Register no.</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Country</th>
              </tr>
            </thead>
            <tbody>
              {entities.length === 0 && (
                <tr><td className="px-4 py-8 text-center text-muted" colSpan={4}>No legal entities yet.</td></tr>
              )}
              {entities.map((e) => (
                <tr key={e.id} className="trow border-b border-line/60">
                  <td className="px-4 py-2.5 font-medium">{e.entity_name}</td>
                  <td className="px-4 py-2.5"><Badge tone="indigo">{e.register_number}</Badge></td>
                  <td className="px-4 py-2.5 text-muted">
                    {regTypes.find((t) => t.id === e.register_number_type_id)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {countries.find((c) => c.id === e.country_id)?.country_name ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Add new</h3>
          <ActionForm action={createLegalEntityAction} submitLabel="Add entity">
            <Field label="Entity name *"><Input name="entity_name" /></Field>
            <Field label="Register number *"><Input name="register_number" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Register number type">
                <Select name="register_number_type_id">
                  <option value="">—</option>
                  {regTypes.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </Select>
              </Field>
              <Field label="Country">
                <Select name="country_id">
                  <option value="">—</option>
                  {countries.map((c) => (<option key={c.id} value={c.id}>{c.country_name}</option>))}
                </Select>
              </Field>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
