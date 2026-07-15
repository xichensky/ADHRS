import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { toIsoDate } from "@/lib/datetime";
import { NewPositionForm } from "./NewPositionForm";
import type { ParentOrgOption } from "../../organizations/OrganizationParentSelector";

export const dynamic = "force-dynamic";

export default async function NewPositionPage() {
  const orgs = await prisma.adhrsOrganizations.findMany({
    where: { deletedAt: null },
    include: {
      versions: {
        where: { deletedAt: null },
        select: { orgName: true, parentOrgId: true, effectiveDate: true, expirationDate: true },
        orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { orgName: "asc" },
  });

  const orgOptions: ParentOrgOption[] = orgs
    .map((org) => ({
      id: org.id,
      name: org.orgName,
      code: org.code,
      versions: org.versions.map((version) => ({
        name: version.orgName,
        parentOrgId: version.parentOrgId,
        effectiveDate: toIsoDate(version.effectiveDate),
        expirationDate: version.expirationDate ? toIsoDate(version.expirationDate) : null,
      })),
    }))
    .filter((org) => org.versions.length > 0);

  return (
    <div>
      <PageHeader title="New position" subtitle="Position version is effective-dated and can be linked to an active organization." />
      <Card className="max-w-2xl">
        <NewPositionForm orgOptions={orgOptions} />
      </Card>
    </div>
  );
}
