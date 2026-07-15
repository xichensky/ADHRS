import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui";
import { toIsoDate, toMidnightUtc } from "@/lib/datetime";
import { OrgTreeSidebar, type OrgTreeItem } from "./OrgTreeSidebar";
import { deleteOrganizationAction } from "./actions";

export const dynamic = "force-dynamic";

type OrgWithVersions = Awaited<ReturnType<typeof loadOrganizations>>[number];
type OrgVersion = OrgWithVersions["versions"][number];
type ActiveOrg = {
  id: number;
  code: string;
  name: string;
  version: OrgVersion;
};

async function loadOrganizations() {
  return prisma.adhrsOrganizations.findMany({
    where: { deletedAt: null },
    include: {
      versions: {
        where: { deletedAt: null },
        select: {
          id: true,
          orgName: true,
          orgType: true,
          costCenterCode: true,
          departmentHeadId: true,
          departmentHead: { select: { id: true, name: true, code: true } },
          parentOrgId: true,
          effectiveDate: true,
          expirationDate: true,
        },
        orderBy: [{ effectiveDate: "asc" }, { id: "asc" }],
      },
    },
    orderBy: { orgName: "asc" },
  });
}

function pickVersionAt(versions: OrgVersion[], asOf: Date): OrgVersion | null {
  const asOfMs = asOf.getTime();
  let selected: OrgVersion | null = null;

  for (const version of versions) {
    const effectiveMs = version.effectiveDate.getTime();
    if (effectiveMs > asOfMs) continue;
    const expirationMs = version.expirationDate?.getTime();
    if (expirationMs !== undefined && expirationMs < asOfMs) continue;
    if (!selected || effectiveMs > selected.effectiveDate.getTime()) {
      selected = version;
    }
  }

  return selected;
}

function compareActiveOrgs(a: ActiveOrg, b: ActiveOrg): number {
  return a.name.localeCompare(b.name) || a.code.localeCompare(b.code) || a.id - b.id;
}

function buildTree(orgs: ActiveOrg[]): OrgTreeItem[] {
  const orgMap = new Map(orgs.map((org) => [org.id, org]));
  const childrenMap = new Map<number | null, ActiveOrg[]>();

  for (const org of orgs) {
    const parentId = org.version.parentOrgId && orgMap.has(org.version.parentOrgId)
      ? org.version.parentOrgId
      : null;
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(org);
    childrenMap.set(parentId, siblings);
  }

  for (const siblings of childrenMap.values()) {
    siblings.sort(compareActiveOrgs);
  }

  const visited = new Set<number>();
  function toNode(org: ActiveOrg): OrgTreeItem | null {
    if (visited.has(org.id)) return null;
    visited.add(org.id);
    return {
      id: org.id,
      name: org.name,
      code: org.code,
      children: (childrenMap.get(org.id) ?? [])
        .map(toNode)
        .filter((node): node is OrgTreeItem => node !== null),
    };
  }

  return (childrenMap.get(null) ?? [])
    .map(toNode)
    .filter((node): node is OrgTreeItem => node !== null);
}

async function deleteOrganizationFromList(fd: FormData): Promise<void> {
  "use server";
  await deleteOrganizationAction({ error: null }, fd);
}

async function changeBusinessDate(fd: FormData): Promise<void> {
  "use server";
  const asOf = String(fd.get("asOf") ?? "").trim();
  const orgId = String(fd.get("orgId") ?? "").trim();
  const params = new URLSearchParams();
  if (orgId) params.set("orgId", orgId);
  if (asOf) params.set("asOf", asOf);
  redirect(`/organizations${params.size ? `?${params.toString()}` : ""}`);
}

function collectDescendants(orgs: ActiveOrg[], parentOrgId: number): ActiveOrg[] {
  const childrenMap = new Map<number, ActiveOrg[]>();
  for (const org of orgs) {
    const parentId = org.version.parentOrgId;
    if (!parentId) continue;
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(org);
    childrenMap.set(parentId, siblings);
  }

  const result: ActiveOrg[] = [];
  const visited = new Set<number>();
  function appendChildren(id: number) {
    for (const child of childrenMap.get(id) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push(child);
      appendChildren(child.id);
    }
  }
  appendChildren(parentOrgId);
  return result;
}

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string; asOf?: string }>;
}) {
  const { orgId: orgIdStr, asOf } = await searchParams;
  const selectedOrgId = orgIdStr ? Number(orgIdStr) : null;
  const asOfDate = toIsoDate(asOf ? toMidnightUtc(asOf) : new Date());
  const today = toIsoDate(new Date());
  const isTodayView = asOfDate === today;
  const asOfDateTime = toMidnightUtc(asOfDate);

  const allOrgs = await loadOrganizations();
  const activeOrgs: ActiveOrg[] = allOrgs
    .map((org): ActiveOrg | null => {
      const version = pickVersionAt(org.versions, asOfDateTime);
      if (!version) return null;
      return {
        id: org.id,
        code: org.code,
        name: version.orgName,
        version,
      };
    })
    .filter((org): org is ActiveOrg => org !== null)
    .sort(compareActiveOrgs);

  const orgMap = new Map(activeOrgs.map((org) => [org.id, org]));
  const treeRoots = buildTree(activeOrgs);

  // Right panel: selected org + all descendants at the selected as-of date.
  const selectedOrg = selectedOrgId ? orgMap.get(selectedOrgId) ?? null : null;
  const descendantOrgs = selectedOrgId ? collectDescendants(activeOrgs, selectedOrgId) : [];

  const rightPanelOrgs = selectedOrg ? [selectedOrg, ...descendantOrgs] : [];

  return (
    <div className="-mx-8 -my-8 flex h-screen overflow-hidden">
      {/* Left sidebar: org tree */}
      <div className="flex w-52 shrink-0 flex-col border-r border-line bg-surface">
        {/* Business date */}
        <form action={changeBusinessDate} className="border-b border-line px-2 py-2">
          {selectedOrgId && <input type="hidden" name="orgId" value={selectedOrgId} />}
          <label className="block text-[11px] font-medium text-muted">
            业务日期
            <input
              name="asOf"
              type="date"
              defaultValue={asOfDate}
              className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1 text-xs text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <button type="submit" className="mt-1 text-[11px] text-accent hover:underline">
            应用
          </button>
        </form>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-1 py-1">
          <OrgTreeSidebar roots={treeRoots} selectedId={selectedOrgId} asOf={asOfDate} />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <Link href="/organizations/new">
            <Button className="text-xs">+ 新增</Button>
          </Link>
          <Button variant="subtle" className="text-xs" disabled>
            导入
          </Button>
          <Button variant="subtle" className="text-xs" disabled>
            导出
          </Button>
          <Button variant="subtle" className="text-xs" disabled>
            列配置
          </Button>
          <div className="ml-auto text-xs text-muted">
            业务日期：<span className="font-medium text-foreground">{asOfDate}</span>
            {!asOf && <span className="ml-1">（默认今天）</span>}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {rightPanelOrgs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              {selectedOrgId ? "该组织在当前日期暂无有效数据。" : "← 请在左侧点击一个组织查看详情"}
            </div>
          ) : (
            <table className="w-full min-w-max text-sm">
              <thead className="sticky top-0 bg-surface/95">
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">组织架构</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">组织编码</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">生效时间</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">失效时间</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">组织类型</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">费用编码</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">部门负责人</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {rightPanelOrgs.map((org) => {
                  const v = org.version;
                  const isSelected = org.id === selectedOrgId;
                  return (
                    <tr
                      key={org.id}
                      className={`border-b border-line/60 text-sm ${isSelected ? "bg-accent/5" : "hover:bg-surface/60"}`}
                    >
                      <td className="px-4 py-2.5 font-medium">{org.name}</td>
                      <td className="px-4 py-2.5 text-muted">{org.code}</td>
                      <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                        {toIsoDate(v.effectiveDate)}
                      </td>
                      <td className="px-4 py-2.5 text-muted whitespace-nowrap">
                        {v.expirationDate ? toIsoDate(v.expirationDate) : "9999-12-31"}
                      </td>
                      <td className="px-4 py-2.5 text-muted">{v.orgType ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted">{v.costCenterCode ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted">
                        {v.departmentHead ? `${v.departmentHead.name} (${v.departmentHead.code})` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 text-muted">
                          <Link
                            href={`/organizations/${org.id}?version=${v.id}`}
                            className="text-accent hover:underline text-xs"
                          >
                            {isTodayView ? "编辑" : "查看"}
                          </Link>
                          {isTodayView && (
                            <form action={deleteOrganizationFromList} className="inline">
                              <input type="hidden" name="orgId" value={org.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                className="h-auto px-0 py-0 text-xs text-red-600 hover:bg-transparent hover:underline"
                              >
                                删除
                              </Button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
