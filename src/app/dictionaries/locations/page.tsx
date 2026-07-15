import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, ActionForm, Field, Input, Select } from "@/components/ui";
import { createLocationAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const [locations, countries] = await Promise.all([
    prisma.location.findMany({ where: { deletedAt: null }, orderBy: [{ level: "asc" }, { code: "asc" }] }),
    prisma.country.findMany({ where: { deletedAt: null }, orderBy: { country_name: "asc" } }),
  ]);
  const parentName = (id: number | null) => locations.find((l) => l.id === id)?.name ?? "—";
  const countryName = (id: number | null) => countries.find((c) => c.id === id)?.country_name ?? "—";

  return (
    <div>
      <PageHeader title="Locations" subtitle="Administrative-division tree (country/province/city/district)." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">Parent</th>
                <th className="px-4 py-3 font-medium">Country</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 && (
                <tr><td className="px-4 py-8 text-center text-muted" colSpan={5}>No locations yet.</td></tr>
              )}
              {locations.map((l) => (
                <tr key={l.id} className="trow border-b border-line/60">
                  <td className="px-4 py-2.5"><Badge tone="indigo">{l.code}</Badge></td>
                  <td className="px-4 py-2.5 font-medium">{"— ".repeat(l.level)}{l.name}</td>
                  <td className="px-4 py-2.5 text-muted">{l.level}</td>
                  <td className="px-4 py-2.5 text-muted">{l.parentId ? parentName(l.parentId) : "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{countryName(l.country_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Add new</h3>
          <ActionForm action={createLocationAction} submitLabel="Add location">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code *"><Input name="code" /></Field>
              <Field label="Name *"><Input name="name" /></Field>
              <Field label="Level"><Input name="level" type="number" defaultValue="0" /></Field>
              <Field label="Parent">
                <Select name="parentId">
                  <option value="">— (top level)</option>
                  {locations.map((l) => (<option key={l.id} value={l.id}>{"— ".repeat(l.level)}{l.name}</option>))}
                </Select>
              </Field>
              <Field label="Country">
                <Select name="country_id">
                  <option value="">—</option>
                  {countries.map((c) => (<option key={c.id} value={c.id}>{c.country_name} ({c.country_code})</option>))}
                </Select>
              </Field>
            </div>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
