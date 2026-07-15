import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { formatAuditActor, formatAuditTime } from "@/lib/audit";
import { compareField, type VersionChange } from "@/lib/versioning/versionDiff";
import { toIsoDate } from "@/lib/datetime";
import { deleteOrgVersionAction } from "../actions";
import type { ParentOrgOption } from "../OrganizationParentSelector";
import {
  CorrectOrgVersionForm,
  OrgChangeVersionForm,
  type OrgVersionFormData,
} from "./OrganizationVersionForms";

export const dynamic = "force-dynamic";

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string; mode?: string }>;
}) {
  const { id } = await params;
  const { version: versionIdStr, mode } = await searchParams;

  const org = await prisma.adhrsOrganizations.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      versions: {
        where: { deletedAt: null },
        orderBy: { effectiveDate: "desc" },
        include: { departmentHead: { select: { id: true, name: true, code: true } } },
      },
    },
  });
  if (!org) notFound();

  const orgs = await prisma.adhrsOrganizations.findMany({
    where: { NOT: { id: org.id }, deletedAt: null },
    orderBy: { orgName: "asc" },
    include: {
      versions: {
        where: { deletedAt: null },
        select: { orgName: true, parentOrgId: true, effectiveDate: true, expirationDate: true },
        orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
      },
    },
  });

  const parentOptions: ParentOrgOption[] = orgs
    .map((o) => ({
      id: o.id,
      name: o.orgName,
      code: o.code,
      versions: o.versions.map((v) => ({
        name: v.orgName,
        parentOrgId: v.parentOrgId,
        effectiveDate: toIsoDate(v.effectiveDate),
        expirationDate: v.expirationDate ? toIsoDate(v.expirationDate) : null,
      })),
    }))
    .filter((o) => o.versions.length > 0);

  // Selected version: from query param, else current_version, else latest
  const selectedVersion =
    (versionIdStr
      ? org.versions.find((v) => v.id === Number(versionIdStr))
      : null) ??
    org.versions.find((v) => v.current_version) ??
    org.versions[0];

  const selectedVersionForm: OrgVersionFormData | null = selectedVersion
    ? {
        id: selectedVersion.id,
        name: selectedVersion.orgName,
        orgType: selectedVersion.orgType,
        costCenterCode: selectedVersion.costCenterCode,
        departmentHeadId: selectedVersion.departmentHeadId,
        parentOrgId: selectedVersion.parentOrgId,
        effectiveDate: toIsoDate(selectedVersion.effectiveDate),
        expirationDate: selectedVersion.expirationDate ? toIsoDate(selectedVersion.expirationDate) : "9999-12-31",
      }
    : null;

  const isAdding = mode === "add";
  const isEditing = mode === "edit";
  const parentOrg = selectedVersion?.parentOrgId
    ? await prisma.adhrsOrganizations.findFirst({ where: { id: selectedVersion.parentOrgId, deletedAt: null } })
    : null;

  const employees = await prisma.adhrsEmployees.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: [{ name: "asc" }, { code: "asc" }],
  });
  const employeeLabel = new Map(employees.map((e) => [e.id, `${e.name} (${e.code})`]));
  const orgLabel = new Map<number, string>([
    ...orgs.map((o) => [o.id, `${o.orgName} (${o.code})`] as const),
    [org.id, `${org.orgName} (${org.code})`],
  ]);
  if (parentOrg) orgLabel.set(parentOrg.id, `${parentOrg.orgName} (${parentOrg.code})`);

  const chronologicalVersions = [...org.versions].sort(
    (a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime() || a.id - b.id,
  );
  const orgChangeMap = new Map<number, VersionChange[]>();
  chronologicalVersions.forEach((version, index) => {
    const previous = chronologicalVersions[index - 1];
    const changes: VersionChange[] = [];
    if (previous) {
      compareField(changes, "组织名称", previous.orgName, version.orgName);
      compareField(changes, "组织类型", previous.orgType, version.orgType);
      compareField(changes, "费用编码", previous.costCenterCode, version.costCenterCode);
      compareField(
        changes,
        "部门负责人",
        previous.departmentHeadId ? employeeLabel.get(previous.departmentHeadId) : null,
        version.departmentHeadId ? employeeLabel.get(version.departmentHeadId) : null,
      );
      compareField(
        changes,
        "上级组织",
        previous.parentOrgId ? orgLabel.get(previous.parentOrgId) : null,
        version.parentOrgId ? orgLabel.get(version.parentOrgId) : null,
      );
    }
    orgChangeMap.set(version.id, changes);
  });
  const selectedIsInitial = selectedVersion ? chronologicalVersions[0]?.id === selectedVersion.id : false;

  return (
    <div>
      <PageHeader
        title={org.orgName}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Badge tone="indigo">{org.code}</Badge>
            <span className="text-muted">{org.structureType ?? "—"}</span>
          </span>
        }
        action={
          <Link href="/organizations">
            <Button variant="subtle">← Back</Button>
          </Link>
        }
      />

      <div className="flex gap-6">
        {/* Left: version timeline */}
        <div className="w-56 shrink-0">
          <div className="space-y-2">
            <h3 className="px-1 text-sm font-semibold text-foreground">History</h3>
            {org.versions.map((v) => {
              const isSelected = v.id === selectedVersion?.id;
              const changes = orgChangeMap.get(v.id) ?? [];
              const isInitial = chronologicalVersions[0]?.id === v.id;
              return (
                <Link
                  key={v.id}
                  href={`/organizations/${org.id}?version=${v.id}`}
                  className={`block rounded-lg border px-3 py-2.5 text-xs transition-colors ${
                    isSelected
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line bg-panel hover:border-accent/40 hover:bg-black/5"
                  }`}
                >
                  <div className="font-semibold">
                    {toIsoDate(v.effectiveDate)} 至 {v.expirationDate ? toIsoDate(v.expirationDate) : "9999-12-31"}
                  </div>
                  {v.current_version && (
                    <span className="mt-0.5 inline-block text-[10px] text-green-600">当前版本</span>
                  )}
                  <div className="mt-2 space-y-1 text-[11px]">
                    {isInitial ? (
                      <div className="text-muted">初始版本</div>
                    ) : changes.length === 0 ? (
                      <div className="text-muted">无业务字段变更</div>
                    ) : (
                      <>
                        {changes.slice(0, 2).map((change) => (
                          <div key={change.field} className="truncate">
                            <span className="text-muted">{change.field}: </span>
                            <span className="text-muted line-through">{change.before}</span>
                            <span className="mx-1 text-muted">→</span>
                            <span className="font-medium text-foreground">{change.after}</span>
                          </div>
                        ))}
                        {changes.length > 2 && (
                          <div className="text-muted">+{changes.length - 2} 项变更</div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-2 border-t border-line/60 pt-2 text-[11px] text-muted">
                    <div>操作人: {formatAuditActor(v.updatedBy, v.createdBy)}</div>
                    <div>创建: {formatAuditTime(v.createdAt)}</div>
                    <div>最后保存: {formatAuditTime(v.updatedAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: main panel */}
        <div className="flex-1">
          {isEditing && selectedVersionForm ? (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">更正版本资料</h3>
                  <p className="mt-1 text-xs text-muted">用于修正当前版本中的录入错误，不产生新的生效版本。</p>
                </div>
                <Link href={`/organizations/${org.id}?version=${selectedVersionForm.id}`}>
                  <Button variant="subtle" type="button">取消</Button>
                </Link>
              </div>
              <CorrectOrgVersionForm
                orgId={org.id}
                version={selectedVersionForm}
                parentOptions={parentOptions}
                employees={employees}
              />
            </Card>
          ) : isAdding ? (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">组织变更 / 新增生效版本</h3>
                  <p className="mt-1 text-xs text-muted">用于从指定生效日期起创建新的组织版本，保留历史版本。</p>
                </div>
                <Link href={`/organizations/${org.id}${selectedVersion ? `?version=${selectedVersion.id}` : ""}`}>
                  <Button variant="subtle" type="button">取消</Button>
                </Link>
              </div>
              <OrgChangeVersionForm
                orgId={org.id}
                baseVersion={selectedVersionForm}
                parentOptions={parentOptions}
                employees={employees}
              />
            </Card>
          ) : selectedVersion ? (
            <Card>
              {/* Action buttons */}
              <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
                <h3 className="text-sm font-semibold text-muted">版本资料</h3>
                <div className="flex items-center gap-2">
                  {org.versions.length > 1 && !selectedIsInitial && (
                    <DeleteVersionButton versionId={selectedVersion.id} />
                  )}
                  <ActionLink href={`/organizations/${org.id}?version=${selectedVersion.id}&mode=edit`}>
                    更正版本资料
                  </ActionLink>
                  <ActionLink href={`/organizations/${org.id}?version=${selectedVersion.id}&mode=add`} primary>
                    组织变更
                  </ActionLink>
                </div>
              </div>

              {/* Fields grid (read-only detail view) */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                <DetailField label="生效时间" value={toIsoDate(selectedVersion.effectiveDate)} />
                <DetailField label="失效时间" value={selectedVersion.expirationDate ? toIsoDate(selectedVersion.expirationDate) : "9999-12-31"} />
                <DetailField label="组织编码" value={org.code} />
                <DetailField label="组织类型" value={selectedVersion.orgType} />
                <DetailField label="组织名称" value={selectedVersion.orgName} />
                <DetailField label="上级组织" value={parentOrg ? `${parentOrg.orgName} (${parentOrg.code})` : "—"} />
                <DetailField label="费用编码" value={selectedVersion.costCenterCode} />
                <DetailField label="部门负责人" value={selectedVersion.departmentHead ? `${selectedVersion.departmentHead.name} (${selectedVersion.departmentHead.code})` : "—"} />
                <DetailField label="状态" value={org.status ? "启用" : "停用"} />
              </div>

              <div className="mt-6 border-t border-line pt-3 text-xs text-muted">
                <div>操作人: {formatAuditActor(selectedVersion.updatedBy, selectedVersion.createdBy)}</div>
                <div>创建: {formatAuditTime(selectedVersion.createdAt)}</div>
                <div>最后保存: {formatAuditTime(selectedVersion.updatedAt)}</div>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="py-8 text-center text-sm text-muted">暂无版本数据。</p>
              <div className="text-center">
                <Link href={`/organizations/${org.id}?mode=add`}>
                  <Button>组织变更 / 新增生效版本</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

async function deleteOrgVersionFromDetail(fd: FormData): Promise<void> {
  "use server";
  await deleteOrgVersionAction({ error: null }, fd);
}

function ActionLink({ href, children, primary = false }: { href: string; children: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors ${
        primary
          ? "bg-accent text-white hover:bg-indigo-600"
          : "border border-line bg-white text-foreground hover:bg-black/5"
      }`}
    >
      {children}
    </Link>
  );
}

function DeleteVersionButton({ versionId }: { versionId: number }) {
  return (
    <form action={deleteOrgVersionFromDetail} className="inline-flex">
      <input type="hidden" name="versionId" value={versionId} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-3 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
      >
        删除
      </button>
    </form>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted">* {label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}
