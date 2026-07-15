"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Select } from "@/components/ui";
import { JOB_LEVELS, optionsOf } from "@/lib/types";
import {
  OrganizationParentSelector,
  type ParentOrgOption,
} from "../../organizations/OrganizationParentSelector";
import { createPositionAction } from "../actions";

export function NewPositionForm({ orgOptions }: { orgOptions: ParentOrgOption[] }) {
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [orgId, setOrgId] = useState("");

  return (
    <ActionForm action={createPositionAction} submitLabel="Create position" cancelHref="/positions">
      <Field label="Name *">
        <Input name="name" placeholder="Senior Engineer" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Effective date *">
          <Input
            name="effectiveDate"
            type="date"
            value={effectiveDate}
            required
            onChange={(event) => {
              setEffectiveDate(event.target.value);
              setOrgId("");
            }}
          />
        </Field>
        <Field label="Expiration date" hint="系统自动计算，默认最新版本为 9999-12-31">
          <Input
            type="date"
            defaultValue="9999-12-31"
            readOnly
            className="bg-surface/60 text-muted cursor-not-allowed"
          />
        </Field>
        <Field label="Job level *">
          <Select name="jobLevel" required>
            {optionsOf(JOB_LEVELS).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </Field>
        <Field
          label="Organization *"
          hint={
            effectiveDate
              ? "仅展示所选生效日期当天有效的组织。"
              : "请先选择生效日期，再选择该日期有效的组织。"
          }
        >
          <OrganizationParentSelector
            parentOptions={orgOptions}
            effectiveDate={effectiveDate}
            value={orgId}
            onChange={setOrgId}
            name="orgId"
            required
            requiredMessage="Organization is required."
          />
        </Field>
      </div>
    </ActionForm>
  );
}
