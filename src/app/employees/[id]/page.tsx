import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, ActionForm, Button, Input, Field } from "@/components/ui";
import { toDateTimeLabel, toIsoDate, computeAge } from "@/lib/datetime";
import { resolveOrgAssignmentAt, resolveBasicInfoAt, resolveCompensationAt } from "@/lib/versioning";
import { deleteOrgAssignmentAction } from "../actions";
import { OrgAssignmentForm } from "./OrgAssignmentForm";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { id } = await params;
  const { asOf } = await searchParams;
  const employee = await prisma.adhrsEmployees.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      versions: {
        where: { deletedAt: null },
        orderBy: { effectiveDate: "desc" },
        include: { org: true, position: true },
      },
      persons: { where: { current_version: true }, take: 1 },
    },
  });
  if (!employee) notFound();

  const [orgs, positions, employees] = await Promise.all([
    prisma.adhrsOrganizations.findMany({ where: { deletedAt: null }, orderBy: { orgName: "asc" } }),
    prisma.adhrsPositions.findMany({ where: { deletedAt: null }, orderBy: { positionName: "asc" } }),
    prisma.adhrsEmployees.findMany({ where: { NOT: { id: employee.id }, deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  const person = employee.persons[0];
  const currentVersion = employee.versions.find((v) => v.current_version) ?? employee.versions[0];

  // as-of date reconstruction (time-axis): resolve each independent infotype at refDate.
  const asOfDate = asOf ? new Date(asOf) : null;
  const useAsOf = !!asOfDate && !Number.isNaN(asOfDate.getTime());
  const refDate = useAsOf ? asOfDate! : null;
  const snapshot = refDate
    ? {
        assignment: await resolveOrgAssignmentAt(employee.id, refDate),
        person: await resolveBasicInfoAt(employee.id, refDate),
        comp: await resolveCompensationAt(employee.id, refDate),
      }
    : null;
  const orgName = (i?: number | null) => orgs.find((o) => o.id === i)?.orgName ?? "—";
  const posName = (i?: number | null) => positions.find((p) => p.id === i)?.positionName ?? "—";
  const empName = (i?: number | null) => employees.find((e) => e.id === i)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title={employee.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Badge tone="indigo">{employee.code}</Badge>
            <span className="text-muted">Hired {toIsoDate(employee.hireDate)}</span>
            {employee.status ? <Badge tone="green">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
          </span>
        }
        action={<Link href="/employees"><Button variant="subtle">← Back</Button></Link>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="查看某日快照（时间轴重建）">
          <Input name="asOf" type="date" defaultValue={asOf ?? ""} />
        </Field>
        <Button type="submit">重建快照</Button>
        {useAsOf && (
          <a href="?"><Button type="button" variant="subtle">回到当前</Button></a>
        )}
      </form>

      {snapshot && (
        <Card className="mb-6 border-accent/40 bg-indigo-50/40">
          <h3 className="mb-3 text-sm font-semibold">
            Snapshot @ {toIsoDate(refDate!)}
            <span className="ml-2 font-normal text-muted">（按当天生效的各 infotype 独立解析）</span>
          </h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">任职（org_assignment）</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <Info label="Event" value={snapshot.assignment?.event_type} />
                <Info label="Organization" value={orgName(snapshot.assignment?.orgId)} />
                <Info label="Position" value={posName(snapshot.assignment?.positionId)} />
                <Info label="Report to" value={empName(snapshot.assignment?.reportToEmployeeId)} />
                <Info label="Employment" value={snapshot.assignment?.employment_type} />
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">个人基本信息（basic_info）</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <Info label="Name" value={snapshot.person?.name} />
                <Info label="Email" value={snapshot.person?.email} />
                <Info label="Mobile" value={snapshot.person?.mobile_phone} />
                <Info label="Gender" value={snapshot.person?.gender} />
                <Info label="Degree" value={snapshot.person?.degree} />
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">薪酬（compensation）</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <Info label="Base salary" value={snapshot.comp?.base_salary?.toString()} />
                <Info label="Pay type" value={snapshot.comp?.pay_type} />
                <Info label="Pay grade" value={snapshot.comp?.pay_grade} />
                <Info label="Pay level" value={snapshot.comp?.pay_level} />
              </div>
            </div>
          </div>
          {!snapshot.assignment && !snapshot.person && !snapshot.comp && (
            <p className="mt-3 text-sm text-muted">该日期无任何生效记录（可能早于入职或晚于所有版本生效日）。</p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card className="p-0">
            <div className="border-b border-line px-4 py-3 text-sm font-semibold">
              Version history ({employee.versions.length})
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-2 font-medium">Effective</th>
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">Org</th>
                  <th className="px-4 py-2 font-medium">Position</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {employee.versions.map((v) => (
                  <tr key={v.id} className="trow border-t border-line/60">
                    <td className="px-4 py-2.5">{toDateTimeLabel(v.effectiveDate)}</td>
                    <td className="px-4 py-2.5">
                      {v.event_type ? (
                        <Badge tone={eventTone(v.event_type)}>{v.event_type}</Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{v.org?.orgName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{v.position?.positionName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{v.employment_type ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {v.current_version ? <Badge tone="green">Current</Badge> : <Badge tone="neutral">Past</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ActionForm action={deleteOrgAssignmentAction} cancelHref={`/employees/${employee.id}`} submitLabel="Delete" className="flex justify-end">
                        <input type="hidden" name="versionId" value={v.id} />
                        <Button type="submit" variant="danger" className="px-2 py-1 text-xs">Delete</Button>
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {person && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold">Current personal profile</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Info label="Email" value={person.email} />
                <Info label="Mobile" value={person.mobile_phone} />
                <Info label="Age" value={computeAge(person.birth_date) != null ? String(computeAge(person.birth_date)) : "—"} />
                <Info label="Gender" value={person.gender} />
                <Info label="Country" value={person.country_id ? String(person.country_id) : "—"} />
                <Info label="City" value={person.city} />
                <Info label="ID no." value={person.id_document_number} />
                <Info label="Degree" value={person.degree} />
                <Info label="Marital" value={person.marital_status} />
              </div>
            </Card>
          )}
        </div>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Add version</h3>
          <OrgAssignmentForm
            employeeId={employee.id}
            currentVersion={
              currentVersion
                ? {
                    orgId: currentVersion.orgId,
                    positionId: currentVersion.positionId,
                    secondaryPositionId: currentVersion.secondaryPositionId,
                    reportToEmployeeId: currentVersion.reportToEmployeeId,
                    employmentType: currentVersion.employment_type,
                    officeLocation: currentVersion.office_location,
                    workLocation: currentVersion.work_location,
                  }
                : null
            }
            orgs={orgs.map((o) => ({ id: o.id, name: o.orgName }))}
            positions={positions.map((p) => ({ id: p.id, name: p.positionName }))}
            employees={employees}
          />
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}

function eventTone(
  t: string | null,
): "neutral" | "green" | "amber" | "indigo" | "red" {
  switch (t) {
    case "Onboard":
    case "Rehire":
      return "green";
    case "Offboard":
      return "red";
    case "Retire":
      return "amber";
    case "Transfer":
    case "Promotion":
      return "indigo";
    default:
      return "neutral";
  }
}
