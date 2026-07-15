import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Button, ActionForm } from "@/components/ui";
import { toIsoDate } from "@/lib/datetime";
import { deleteContractAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const contracts = await prisma.adhrs_contract.findMany({
    where: { deletedAt: null },
    include: {
      employee: true,
      contract_type: true,
      legalEntityRelations: { include: { legal_entity: true } },
    },
    orderBy: { id: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="On create: contract_no is generated and pushed to CMS (stubbed)."
        action={<Link href="/contracts/new"><Button>+ New contract</Button></Link>}
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-medium">Contract No.</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Legal entities</th>
              <th className="px-4 py-3 font-medium">Effective</th>
              <th className="px-4 py-3 font-medium">CMS UUID</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-muted" colSpan={7}>
                No contracts yet.{" "}
                <Link href="/contracts/new" className="text-accent hover:underline">Create one →</Link>
              </td></tr>
            )}
            {contracts.map((c) => (
              <tr key={c.id} className="trow border-b border-line/60">
                <td className="px-4 py-2.5"><Badge tone="indigo">{c.conctract_no}</Badge></td>
                <td className="px-4 py-2.5">{c.contract_title ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted">{c.employee?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted">
                  {c.legalEntityRelations.map((r) => r.legal_entity?.entity_name).filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-2.5 text-muted">{toIsoDate(c.effective_date)}</td>
                <td className="px-4 py-2.5">
                  {c.cms_contract_uuid ? <Badge tone="green">Pushed</Badge> : <Badge tone="amber">Pending</Badge>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ActionForm action={deleteContractAction} cancelHref="/contracts" submitLabel="Delete" className="flex justify-end">
                    <input type="hidden" name="contractId" value={c.id} />
                    <Button type="submit" variant="danger" className="px-2 py-1 text-xs">Delete</Button>
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
