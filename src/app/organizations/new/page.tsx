import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { toIsoDate } from "@/lib/datetime";
import { NewOrganizationForm, type ParentOrgOption } from "./NewOrganizationForm";

export const dynamic = "force-dynamic";

export default async function NewOrganizationPage() {
  const [orgs, employees] = await Promise.all([
    prisma.adhrsOrganizations.findMany({
      where: { deletedAt: null },
      include: {
        versions: {
          where: { deletedAt: null },
          select: { orgName: true, parentOrgId: true, effectiveDate: true, expirationDate: true },
          orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
        },
      },
      orderBy: { orgName: "asc" },
    }),
    prisma.adhrsEmployees.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: [{ name: "asc" }, { code: "asc" }],
    }),
  ]);

  const parentOptions: ParentOrgOption[] = orgs
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
      <PageHeader title="New organization" subtitle="Initial version is created with the master row." />
      <Card className="max-w-2xl">
        <NewOrganizationForm parentOptions={parentOptions} employees={employees} />
      </Card>
    </div>
  );
}
