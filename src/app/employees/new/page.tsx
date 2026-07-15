import { prisma } from "@/lib/prisma";
import { PageHeader, Card, ActionForm, Field, Input, Select } from "@/components/ui";
import {
  EMPLOYMENT_TYPES, GENDERS, MARITAL_STATUSES, HEALTH_STATUSES, DEGREES,
  EMERGENCY_RELATIONSHIPS, optionsOf,
} from "@/lib/types";
import { createEmployeeAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const [orgs, positions, employees, countries, idDocTypes] = await Promise.all([
    prisma.adhrsOrganizations.findMany({ where: { deletedAt: null }, orderBy: { orgName: "asc" } }),
    prisma.adhrsPositions.findMany({ where: { deletedAt: null }, orderBy: { positionName: "asc" } }),
    prisma.adhrsEmployees.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.country.findMany({ where: { deletedAt: null }, orderBy: { country_name: "asc" } }),
    prisma.id_document_type.findMany({ where: { deletedAt: null } }),
  ]);

  return (
    <div>
      <PageHeader title="New employee" subtitle="Creates master + first version + person profile; code is generated." />
      <Card className="max-w-3xl">
        <ActionForm action={createEmployeeAction} submitLabel="Create employee" cancelHref="/employees">
          <h3 className="text-sm font-semibold text-muted">Employment</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employee name *"><Input name="name" /></Field>
            <Field label="Hire date *"><Input name="hireDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Organization">
              <Select name="orgId">
                <option value="">—</option>
                {orgs.map((o) => (<option key={o.id} value={o.id}>{o.orgName} ({o.code})</option>))}
              </Select>
            </Field>
            <Field label="Position">
              <Select name="positionId">
                <option value="">—</option>
                {positions.map((p) => (<option key={p.id} value={p.id}>{p.positionName} ({p.code})</option>))}
              </Select>
            </Field>
            <Field label="Report to">
              <Select name="reportToEmployeeId">
                <option value="">—</option>
                {employees.map((e) => (<option key={e.id} value={e.id}>{e.name} ({e.code})</option>))}
              </Select>
            </Field>
            <Field label="Employment type">
              <Select name="employmentType">
                <option value="">—</option>
                {optionsOf(EMPLOYMENT_TYPES).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </Select>
            </Field>
            <Field label="Office location"><Input name="officeLocation" /></Field>
            <Field label="Work location"><Input name="workLocation" /></Field>
            <Field label="Effective date *"><Input name="effectiveDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Expiration date"><Input name="expirationDate" type="date" /></Field>
            <Field label="Managing people?">
              <label className="flex items-center gap-2 pt-6 text-sm">
                <Input name="managingPeopleOrNot" type="checkbox" className="w-auto" />
                <span>Is a people manager</span>
              </label>
            </Field>
          </div>

          <h3 className="pt-2 text-sm font-semibold text-muted">Personal profile</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Local language name"><Input name="localLanguageName" /></Field>
            <Field label="Gender">
              <Select name="gender"><option value="">—</option>{optionsOf(GENDERS).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</Select>
            </Field>
            <Field label="Birth date"><Input name="birthDate" type="date" /></Field>
            <Field label="Email"><Input name="email" type="email" /></Field>
            <Field label="Mobile phone"><Input name="mobilePhone" /></Field>
            <Field label="ID document type">
              <Select name="idDocumentTypeId">
                <option value="">—</option>
                {idDocTypes.map((t) => (<option key={t.id} value={t.id}>{t.document_type_name}</option>))}
              </Select>
            </Field>
            <Field label="ID document number"><Input name="idDocumentNumber" /></Field>
            <Field label="Country">
              <Select name="countryId">
                <option value="">—</option>
                {countries.map((c) => (<option key={c.id} value={c.id}>{c.country_name} ({c.country_code})</option>))}
              </Select>
            </Field>
            <Field label="Degree">
              <Select name="degree"><option value="">—</option>{optionsOf(DEGREES).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</Select>
            </Field>
            <Field label="City"><Input name="city" /></Field>
            <Field label="Province"><Input name="province" /></Field>
            <Field label="Marital status">
              <Select name="maritalStatus"><option value="">—</option>{optionsOf(MARITAL_STATUSES).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</Select>
            </Field>
            <Field label="Health status">
              <Select name="healthStatus"><option value="">—</option>{optionsOf(HEALTH_STATUSES).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</Select>
            </Field>
            <Field label="Emergency contact name"><Input name="emergencyContactName" /></Field>
            <Field label="Emergency contact phone"><Input name="emergencyContactPhone" /></Field>
            <Field label="Emergency contact relationship">
              <Select name="emergencyContactRelationship"><option value="">—</option>{optionsOf(EMERGENCY_RELATIONSHIPS).map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</Select>
            </Field>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
