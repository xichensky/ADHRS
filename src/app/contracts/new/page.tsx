import { prisma } from "@/lib/prisma";
import { PageHeader, Card, ActionForm, Field, Input, Select } from "@/components/ui";
import { CONTRACT_ACTION_TYPES, CONTRACT_TERM_TYPES, CONTRACT_STATUSES, optionsOf } from "@/lib/types";
import { createContractAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const [types, employees, legalEntities] = await Promise.all([
    prisma.adhrs_hrs_contract_type.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.adhrsEmployees.findMany({ orderBy: { name: "asc" } }),
    prisma.adhrs_legal_entity.findMany({ where: { deletedAt: null }, orderBy: { entity_name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="New contract" subtitle="contract_no is generated (TYPE-YYYYMMDD-NNN) and pushed to CMS." />
      <Card className="max-w-3xl">
        <ActionForm action={createContractAction} submitLabel="Create contract" cancelHref="/contracts">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contract type *">
              <Select name="contractTypeId">
                <option value="">—</option>
                {types.map((t) => (<option key={t.id} value={t.id}>{t.name} ({t.code})</option>))}
              </Select>
            </Field>
            <Field label="Employee">
              <Select name="employeeId">
                <option value="">—</option>
                {employees.map((e) => (<option key={e.id} value={e.id}>{e.name} ({e.code})</option>))}
              </Select>
            </Field>
            <Field label="Title"><Input name="title" /></Field>
            <Field label="Action type">
              <Select name="actionType"><option value="">—</option>{optionsOf(CONTRACT_ACTION_TYPES).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</Select>
            </Field>
            <Field label="Term type">
              <Select name="termType"><option value="">—</option>{optionsOf(CONTRACT_TERM_TYPES).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</Select>
            </Field>
            <Field label="Status">
              <Select name="status">{optionsOf(CONTRACT_STATUSES).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</Select>
            </Field>
            <Field label="Sign date"><Input name="signDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Effective date"><Input name="effectiveDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Expire date"><Input name="expireDate" type="date" /></Field>
            <Field label="Terminate date"><Input name="terminateDate" type="date" /></Field>
          </div>
          <Field label="Legal entities (multi-select with Cmd/Ctrl)">
            <Select name="legalEntityIds" multiple size={Math.min(6, Math.max(2, legalEntities.length))}>
              {legalEntities.map((le) => (<option key={le.id} value={le.id}>{le.entity_name} ({le.register_number})</option>))}
            </Select>
          </Field>
        </ActionForm>
      </Card>
    </div>
  );
}
