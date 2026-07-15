"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Select } from "@/components/ui";
import { ORG_TYPES, optionsOf } from "@/lib/types";
import {
  OrganizationParentSelector,
  type ParentOrgOption,
} from "../OrganizationParentSelector";
import { createOrganizationAction } from "../actions";

export type { ParentOrgOption } from "../OrganizationParentSelector";

type EmployeeOption = { id: number; name: string; code: string };

export function NewOrganizationForm({
  parentOptions,
  employees,
}: {
  parentOptions: ParentOrgOption[];
  employees: EmployeeOption[];
}) {
  const [effectiveDate, setEffectiveDate] = useState("");
  const [parentOrgId, setParentOrgId] = useState("");
  const parentSelectDisabled = !effectiveDate;

  return (
    <ActionForm action={createOrganizationAction} submitLabel="Create organization" cancelHref="/organizations">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Name *">
            <Input name="name" placeholder="Shenzhen Engineering" required />
          </Field>
        </div>
        <Field label="Effective date *">
          <Input
            name="effectiveDate"
            type="date"
            value={effectiveDate}
            required
            onChange={(e) => {
              setEffectiveDate(e.target.value);
              setParentOrgId("");
            }}
          />
        </Field>
        <Field label="Expiration date">
          <Input
            name="expirationDate"
            type="date"
            defaultValue="9999-12-31"
            readOnly
            className="bg-surface/60 text-muted cursor-not-allowed"
          />
        </Field>
        <Field label="Org type *">
          <Select name="orgType" required>
            <option value="">—</option>
            {optionsOf(ORG_TYPES).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Cost center code">
          <Input name="costCenterCode" placeholder="CC1001" />
        </Field>
        <Field label="Department head">
          <Select name="departmentHeadId">
            <option value="">—</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name} ({employee.code})</option>
            ))}
          </Select>
        </Field>
        <Field
          label={parentOptions.length > 0 ? "Parent organization *" : "Parent organization"}
          hint={
            parentOptions.length === 0
              ? "首个组织可不选择上级组织。"
              : parentSelectDisabled
                ? "Enter an effective date before selecting a parent organization."
                : "Only organizations effective on the selected date are available."
          }
        >
          <OrganizationParentSelector
            parentOptions={parentOptions}
            effectiveDate={effectiveDate}
            value={parentOrgId}
            onChange={setParentOrgId}
            required={parentOptions.length > 0}
          />
        </Field>
      </div>
    </ActionForm>
  );
}
