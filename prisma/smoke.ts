// Smoke test of key business logic. Run: npm run smoke (after `npm run seed`).
// Covers regression cases plus organization/position/employee timeline guards.
import { prisma } from "@/lib/prisma";
import { toErrorResult } from "@/lib/errors";
import { toMidnightUtc, toIsoDate } from "@/lib/datetime";
import {
  createEmployee,
  addOrgAssignment,
  deleteOrgAssignment,
  createOrganization,
  addOrganizationVersion,
  editOrganizationVersion,
  deleteOrganizationVersion,
  deleteOrganization,
  createPosition,
  addPositionVersion,
  deletePositionVersion,
  deletePosition,
  upsertBasicInfo,
  upsertCompensation,
  deleteCompensation,
} from "@/lib/triggers";
import { runDailyVersionSwitch } from "@/lib/scheduler";
import { resolveOrgVersionAt, resolveBasicInfoAt, resolveCompensationAt } from "@/lib/versioning";

const DAY = 24 * 3600 * 1000;
const OPEN_END = "9999-12-31";

async function main() {
  let pass = 0;
  let fail = 0;
  const check = (name: string, ok: boolean, detail = "") => {
    if (ok) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name} ${detail}`); }
  };
  const expectCode = async (name: string, fn: () => Promise<unknown>, code: string) => {
    try { await fn(); check(name, false, "(no error thrown)"); }
    catch (e) { const r = toErrorResult(e); check(name, r.code === code, `(got ${r.code}: ${r.message})`); }
  };

  console.log("1) Duplicate-email precheck throws UniqueViolationError");
  const seededEmp = await prisma.adhrsEmployees.findFirst({ include: { versions: true } });
  if (!seededEmp) throw new Error("no seeded employee — run `npm run seed` first");
  await expectCode("duplicate email blocked", () =>
    createEmployee(
      { hireDate: new Date(), effectiveDate: new Date() },
      { name: "Dup", email: "zhangsan@example.com" },
    ), "UNIQUE_VIOLATION");

  console.log("2) Future-dated employee version does NOT become current");
  const future = new Date(Date.now() + 30 * DAY);
  const beforeCount = seededEmp.versions.length;
  await addOrgAssignment(seededEmp.id, {
    eventType: "Transfer",
    effectiveDate: future,
    employmentType: "Full-time",
  });
  const afterCount = await prisma.adhrsEmployeeOrgAssignment.count({ where: { employeeId: seededEmp.id } });
  check("version count increased", afterCount === beforeCount + 1, `(now ${afterCount})`);
  const cur = await prisma.adhrsEmployeeOrgAssignment.findFirst({
    where: { employeeId: seededEmp.id, current_version: true },
  });
  check("current is still the today-dated version", cur != null && cur.effectiveDate.getTime() <= Date.now(), `(cur effective ${cur?.effectiveDate.toISOString()})`);

  console.log("3) Last-version-delete guard throws on org with one version");
  const oneVersionOrg = await createOrganization({ name: "OneVersion", structureType: "Business", prefix: "OV", effectiveDate: new Date(Date.now() - 5 * DAY) });
  await expectCode("last-version delete blocked", () => deleteOrganizationVersion(oneVersionOrg.versionId), "LAST_VERSION_PROTECTED");

  console.log("4) Duplicate effectiveDate on an employee version is blocked");
  await expectCode("duplicate effectiveDate blocked", () =>
    addOrgAssignment(seededEmp.id, {
      eventType: "Transfer",
      effectiveDate: future,
      employmentType: "Full-time",
    }), "DUPLICATE_EFFECTIVE_DATE");

  console.log("5) Org hierarchy cycle is blocked");
  const d0 = new Date(Date.now() - 20 * DAY);
  const d1 = new Date(Date.now() - 19 * DAY);
  const d2 = new Date(Date.now() - 18 * DAY);
  const orgA = await createOrganization({ name: "CycleA", structureType: "Business", prefix: "CYC", effectiveDate: d0 });
  const orgB = await createOrganization({ name: "CycleB", structureType: "Business", prefix: "CYC", effectiveDate: d0 });
  await addOrganizationVersion(orgB.orgId, { name: "CycleB", parentOrgId: orgA.orgId, effectiveDate: d1 });
  await expectCode("A -> B cycle blocked", () =>
    addOrganizationVersion(orgA.orgId, { name: "CycleA", parentOrgId: orgB.orgId, effectiveDate: d2 }), "VALIDATION_ERROR");

  console.log("6) Concurrent codegen produces distinct codes");
  const conc = await Promise.all([
    createOrganization({ name: "Conc1", prefix: "CONC", effectiveDate: new Date() }),
    createOrganization({ name: "Conc2", prefix: "CONC", effectiveDate: new Date() }),
    createOrganization({ name: "Conc3", prefix: "CONC", effectiveDate: new Date() }),
  ]);
  const codes = conc.map((c) => c.code);
  check("three distinct codes", new Set(codes).size === 3, `(${codes.join(", ")})`);
  check("all start with CONC", codes.every((c) => c.startsWith("CONC")), `(${codes.join(", ")})`);

  console.log("7) Expiration date is system-managed on employee org assignment");
  const expEmp = await createEmployee(
    { hireDate: new Date(Date.now() - 10 * DAY), effectiveDate: new Date(Date.now() - 10 * DAY) },
    { name: "Expire", email: "expire@example.com" },
  );
  await addOrgAssignment(expEmp.employeeId, {
    eventType: "Transfer",
    effectiveDate: new Date(Date.now() - 2 * DAY),
    expirationDate: new Date(Date.now() - 1 * DAY),
    employmentType: "Full-time",
  });
  const expVersions = await prisma.adhrsEmployeeOrgAssignment.findMany({
    where: { employeeId: expEmp.employeeId },
    orderBy: { effectiveDate: "asc" },
  });
  check("submitted expirationDate is ignored for latest assignment", toIsoDate(expVersions.at(-1)?.expirationDate) === OPEN_END, `(got ${toIsoDate(expVersions.at(-1)?.expirationDate)})`);

  console.log("8) Scheduler self-heals a stale current flag (catch-up)");
  const schedEmp = await createEmployee(
    { hireDate: new Date(Date.now() - 5 * DAY), effectiveDate: new Date(Date.now() - 5 * DAY) },
    { name: "Sched", email: "sched@example.com" },
  );
  const today = toMidnightUtc(new Date());
  await prisma.adhrsEmployeeOrgAssignment.create({
    data: { employeeId: schedEmp.employeeId, effectiveDate: today, expirationDate: toMidnightUtc(OPEN_END), current_version: false },
  });
  await runDailyVersionSwitch(new Date());
  const healed = await prisma.adhrsEmployeeOrgAssignment.findFirst({
    where: { employeeId: schedEmp.employeeId, current_version: true },
  });
  check("scheduler flipped today's version to current", healed != null && healed.effectiveDate.getTime() === today.getTime(), `(cur effective ${healed?.effectiveDate.toISOString()})`);

  console.log("9) Retroactive org correction is reflected at read time (no frozen pointer)");
  const rx = await createOrganization({ name: "OldName", prefix: "RX", effectiveDate: new Date(Date.now() - 5 * DAY) });
  await createEmployee(
    { hireDate: new Date(Date.now() - 3 * DAY), effectiveDate: new Date(Date.now() - 3 * DAY), orgId: rx.orgId },
    { name: "Rx", email: "rx@example.com" },
  );
  await addOrganizationVersion(rx.orgId, { name: "NewName", effectiveDate: new Date(Date.now() - 4 * DAY) });
  const rxAtEmpDate = await resolveOrgVersionAt(rx.orgId, new Date(Date.now() - 3 * DAY));
  check("org name at employee's date reflects the backdated rename", rxAtEmpDate?.orgName === "NewName", `(got ${rxAtEmpDate?.orgName})`);

  console.log("10) Person infotype is decoupled from the employee version");
  const dec = await createEmployee(
    { hireDate: new Date(Date.now() - 5 * DAY), effectiveDate: new Date(Date.now() - 5 * DAY) },
    { name: "Dec", email: "dec@example.com", mobilePhone: "111" },
  );
  const empVersionsBefore = await prisma.adhrsEmployeeOrgAssignment.count({ where: { employeeId: dec.employeeId } });
  await upsertBasicInfo(dec.employeeId, { name: "Dec", email: "dec@example.com", mobilePhone: "222", effectiveDate: new Date() });
  const empVersionsAfter = await prisma.adhrsEmployeeOrgAssignment.count({ where: { employeeId: dec.employeeId } });
  const personCur = await prisma.adhrs_employee_basic_info.findFirst({ where: { employee_id: dec.employeeId, current_version: true } });
  check("phone change did NOT create an employee version", empVersionsAfter === empVersionsBefore, `(before ${empVersionsBefore}, after ${empVersionsAfter})`);
  check("person current switched to new phone", personCur?.mobile_phone === "222", `(got ${personCur?.mobile_phone})`);
  await addOrgAssignment(dec.employeeId, { eventType: "Transfer", effectiveDate: new Date(Date.now() + DAY), employmentType: "Full-time" });
  const personCurAfterOrg = await prisma.adhrs_employee_basic_info.findFirst({ where: { employee_id: dec.employeeId, current_version: true } });
  check("org change did NOT change person current", personCurAfterOrg?.mobile_phone === "222", `(got ${personCurAfterOrg?.mobile_phone})`);

  console.log("11) resolveBasicInfoAt / resolveCompensationAt resolve by date; compensation history");
  await upsertCompensation(dec.employeeId, { payType: "Monthly", baseSalary: 20000, effectiveDate: new Date(Date.now() - 10 * DAY) });
  await upsertCompensation(dec.employeeId, { payType: "Monthly", baseSalary: 25000, effectiveDate: new Date(Date.now() - 2 * DAY) });
  const compPast = await resolveCompensationAt(dec.employeeId, new Date(Date.now() - 8 * DAY));
  check("compensation at -8d is the 20000 period", compPast?.base_salary?.toString() === "20000", `(got ${compPast?.base_salary?.toString()})`);
  const compNow = await resolveCompensationAt(dec.employeeId, new Date());
  check("compensation now is the 25000 period", compNow?.base_salary?.toString() === "25000", `(got ${compNow?.base_salary?.toString()})`);
  const personPast = await resolveBasicInfoAt(dec.employeeId, new Date(Date.now() - 4 * DAY));
  check("person at -4d is the old phone (111)", personPast?.mobile_phone === "111", `(got ${personPast?.mobile_phone})`);

  console.log("12) Compensation soft-delete frees the effective_date; dup guard still via trigger");
  const cu = await createEmployee(
    { hireDate: new Date(Date.now() - 5 * DAY), effectiveDate: new Date(Date.now() - 5 * DAY) },
    { name: "Cu", email: "cu@example.com" },
  );
  const cuDate = new Date(Date.now() - 3 * DAY);
  const c1 = await upsertCompensation(cu.employeeId, { payType: "Monthly", baseSalary: 18000, effectiveDate: cuDate });
  await deleteCompensation(c1.compensationId);
  const c2 = await upsertCompensation(cu.employeeId, { payType: "Monthly", baseSalary: 20000, effectiveDate: cuDate });
  check("re-created compensation with same effective_date after soft-delete", c2.compensationId > 0, `(id ${c2.compensationId})`);
  await expectCode("duplicate active effectiveDate still blocked by trigger", () =>
    upsertCompensation(cu.employeeId, { payType: "Monthly", baseSalary: 21000, effectiveDate: cuDate }), "DUPLICATE_EFFECTIVE_DATE");

  console.log("13) Organization timeline insertion, editing, and deletion repair ranges");
  const tl = await createOrganization({ name: "Timeline", prefix: "TL", effectiveDate: "2024-01-01" });
  const tlLatest = await addOrganizationVersion(tl.orgId, { name: "Timeline 2024-03", effectiveDate: "2024-03-01" });
  const tlMiddle = await addOrganizationVersion(tl.orgId, { name: "Timeline 2024-02", effectiveDate: "2024-02-01" });
  let tlVersions = await prisma.adhrsOrganizationVersions.findMany({ where: { orgId: tl.orgId }, orderBy: { effectiveDate: "asc" } });
  check("middle org version inserted and ranges normalized", toIsoDate(tlVersions[0].expirationDate) === "2024-01-31" && toIsoDate(tlVersions[1].expirationDate) === "2024-02-29" && toIsoDate(tlVersions[2].expirationDate) === OPEN_END);
  await expectCode("cannot add org version before first history", () =>
    addOrganizationVersion(tl.orgId, { name: "Too Early", effectiveDate: "2023-12-01" }), "VALIDATION_ERROR");
  await expectCode("first org version delete blocked", () => deleteOrganizationVersion(tl.versionId), "VALIDATION_ERROR");
  await editOrganizationVersion(tlMiddle.versionId, { name: "Timeline 2024-02 moved", effectiveDate: "2024-02-10" });
  tlVersions = await prisma.adhrsOrganizationVersions.findMany({ where: { orgId: tl.orgId }, orderBy: { effectiveDate: "asc" } });
  check("org effective-date edit repairs previous expiration", toIsoDate(tlVersions[0].expirationDate) === "2024-02-09", `(got ${toIsoDate(tlVersions[0].expirationDate)})`);
  await deleteOrganizationVersion(tlMiddle.versionId);
  tlVersions = await prisma.adhrsOrganizationVersions.findMany({ where: { orgId: tl.orgId }, orderBy: { effectiveDate: "asc" } });
  check("middle org delete repairs previous expiration", toIsoDate(tlVersions[0].expirationDate) === "2024-02-29", `(got ${toIsoDate(tlVersions[0].expirationDate)})`);
  await deleteOrganizationVersion(tlLatest.versionId);
  tlVersions = await prisma.adhrsOrganizationVersions.findMany({ where: { orgId: tl.orgId }, orderBy: { effectiveDate: "asc" } });
  check("latest org delete opens previous version", toIsoDate(tlVersions[0].expirationDate) === OPEN_END, `(got ${toIsoDate(tlVersions[0].expirationDate)})`);

  console.log("14) Parent org must be effective at child effective date and child blocks late parent edit");
  const parent = await createOrganization({ name: "Parent", prefix: "PAR", effectiveDate: "2024-01-01" });
  await createOrganization({ name: "Child", prefix: "CHI", parentOrgId: parent.orgId, effectiveDate: "2024-02-01" });
  await expectCode("parent effective date cannot move after child", () =>
    editOrganizationVersion(parent.versionId, { name: "Parent late", effectiveDate: "2024-03-01" }), "VALIDATION_ERROR");
  const notYetParent = await createOrganization({ name: "NotYetParent", prefix: "NYP", effectiveDate: "2025-01-01" });
  await expectCode("inactive-at-date parent is blocked", () =>
    createOrganization({ name: "BadChild", prefix: "BCHI", parentOrgId: notYetParent.orgId, effectiveDate: "2024-06-01" }), "VALIDATION_ERROR");

  console.log("15) Organization master delete protects bound subtrees and soft-deletes unbound subtrees");
  const boundRoot = await createOrganization({ name: "BoundRoot", prefix: "BR", effectiveDate: "2024-01-01" });
  const boundChild = await createOrganization({ name: "BoundChild", prefix: "BC", parentOrgId: boundRoot.orgId, effectiveDate: "2024-02-01" });
  await createPosition({ name: "BoundPosition", orgId: boundChild.orgId, effectiveDate: "2024-03-01" });
  await expectCode("bound subtree delete blocked", () => deleteOrganization(boundRoot.orgId), "VALIDATION_ERROR");
  const freeRoot = await createOrganization({ name: "FreeRoot", prefix: "FR", effectiveDate: "2024-01-01" });
  const freeChild = await createOrganization({ name: "FreeChild", prefix: "FC", parentOrgId: freeRoot.orgId, effectiveDate: "2024-02-01" });
  await deleteOrganization(freeRoot.orgId);
  const freeAll = await prisma.adhrsOrganizations.findMany({
    where: { id: { in: [freeRoot.orgId, freeChild.orgId] } },
    include: { versions: true },
  });
  const freeActive = freeAll.filter((org) => !org.deletedAt);
  check("unbound subtree is hidden by soft-delete", freeActive.length === 0, `(active ${freeActive.length})`);
  check(
    "soft-deleted org masters and versions remain with deletedAt/current cleared",
    freeAll.length === 2 && freeAll.every((org) => org.deletedAt && org.status === false && org.versions.every((v) => v.deletedAt && !v.current_version)),
    `(rows ${freeAll.length})`,
  );
  await runDailyVersionSwitch(new Date("2026-01-01"));
  const freeDeletedVersionsCurrent = await prisma.adhrsOrganizationVersions.count({
    where: { orgId: { in: [freeRoot.orgId, freeChild.orgId] }, current_version: true },
  });
  check("scheduler does not reactivate soft-deleted org versions", freeDeletedVersionsCurrent === 0, `(current ${freeDeletedVersionsCurrent})`);
  await expectCode("position cannot bind soft-deleted org", () =>
    createPosition({ name: "Deleted Org Position", orgId: freeRoot.orgId, effectiveDate: "2024-03-01" }), "VALIDATION_ERROR");
  await expectCode("employee cannot bind soft-deleted org", () =>
    createEmployee(
      { hireDate: "2024-03-01", effectiveDate: "2024-03-01", orgId: freeRoot.orgId },
      { name: "Deleted Org Employee", email: "deleted-org-employee@example.com" },
    ), "VALIDATION_ERROR");

  console.log("16) Position and employee assignment timelines share first/delete/range rules");
  const pos = await createPosition({ name: "Timeline Position", effectiveDate: "2024-01-01" });
  const posLatest = await addPositionVersion(pos.positionId, { name: "Timeline Position Mar", effectiveDate: "2024-03-01" });
  const posMiddle = await addPositionVersion(pos.positionId, { name: "Timeline Position Feb", effectiveDate: "2024-02-01" });
  await expectCode("first position version delete blocked", () => deletePositionVersion(pos.versionId), "VALIDATION_ERROR");
  await deletePositionVersion(posMiddle.versionId);
  await deletePositionVersion(posLatest.versionId);
  const posOnly = await prisma.adhrsPositionVersions.findFirst({ where: { positionId: pos.positionId } });
  check("position delete repairs to open end", toIsoDate(posOnly?.expirationDate) === OPEN_END, `(got ${toIsoDate(posOnly?.expirationDate)})`);

  console.log("17) Position master delete protects positions bound to employees and soft-deletes unbound ones");
  const boundPos = await createPosition({ name: "BoundToEmployee", effectiveDate: "2024-01-01" });
  const holder = await createEmployee(
    { hireDate: "2024-01-01", effectiveDate: "2024-01-01", positionId: boundPos.positionId },
    { name: "Position Holder", email: "position-holder@example.com" },
  );
  await expectCode("bound position delete blocked", () => deletePosition(boundPos.positionId), "VALIDATION_ERROR");
  const freePos = await createPosition({ name: "FreePosition", effectiveDate: "2024-01-01" });
  await deletePosition(freePos.positionId);
  const freePosRows = await prisma.adhrsPositions.findMany({ where: { id: freePos.positionId }, include: { versions: true } });
  check(
    "soft-deleted position master + versions carry deletedAt and cleared flags",
    freePosRows.length === 1 &&
      freePosRows[0].deletedAt !== null &&
      freePosRows[0].status === false &&
      freePosRows[0].versions.every((v) => v.deletedAt !== null && !v.current_version),
    `(rows ${freePosRows.length})`,
  );
  const freePosActive = await prisma.adhrsPositions.findMany({ where: { id: freePos.positionId, deletedAt: null } });
  check("soft-deleted position hidden from active list", freePosActive.length === 0, `(active ${freePosActive.length})`);
  void holder;

  const assignee = await createEmployee(
    { hireDate: "2024-01-01", effectiveDate: "2024-01-01" },
    { name: "Assign Timeline", email: "assign-timeline@example.com" },
  );
  const assignLatest = await addOrgAssignment(assignee.employeeId, { eventType: "Transfer", effectiveDate: "2024-03-01" });
  const assignMiddle = await addOrgAssignment(assignee.employeeId, { eventType: "Transfer", effectiveDate: "2024-02-01" });
  await expectCode("first assignment delete blocked", () => deleteOrgAssignment(assignee.versionId), "VALIDATION_ERROR");
  await deleteOrgAssignment(assignMiddle.versionId);
  await deleteOrgAssignment(assignLatest.versionId);
  const assignOnly = await prisma.adhrsEmployeeOrgAssignment.findFirst({ where: { employeeId: assignee.employeeId } });
  check("assignment delete repairs to open end", toIsoDate(assignOnly?.expirationDate) === OPEN_END, `(got ${toIsoDate(assignOnly?.expirationDate)})`);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}
main().finally(() => prisma.$disconnect());
