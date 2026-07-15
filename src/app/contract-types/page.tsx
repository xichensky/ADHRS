import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, ActionForm, Field, Input } from "@/components/ui";
import { createContractTypeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContractTypesPage() {
  const types = await prisma.adhrs_hrs_contract_type.findMany({
    where: { deletedAt: null },
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <PageHeader title="Contract types" subtitle="HRS contract type dictionary; linked to CMS on contract push." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
              </tr>
            </thead>
            <tbody>
              {types.length === 0 && (
                <tr><td className="px-4 py-8 text-center text-muted" colSpan={2}>No contract types yet.</td></tr>
              )}
              {types.map((t) => (
                <tr key={t.id} className="trow border-b border-line/60">
                  <td className="px-4 py-2.5"><Badge tone="indigo">{t.code}</Badge></td>
                  <td className="px-4 py-2.5 font-medium">{t.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Add new</h3>
          <ActionForm action={createContractTypeAction} submitLabel="Add type">
            <Field label="Code *"><Input name="code" placeholder="FT" /></Field>
            <Field label="Name *"><Input name="name" placeholder="Full-time" /></Field>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
