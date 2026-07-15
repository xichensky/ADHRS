"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Select } from "@/components/ui";
import { ORG_TYPES, optionsOf } from "@/lib/types";
import {
  OrganizationParentSelector,
  type ParentOrgOption,
} from "../OrganizationParentSelector";
import { addOrgVersionAction, editOrgVersionAction } from "../actions";

export type OrgVersionFormData = {
  id: number;
  name: string;
  orgType: string | null;
  costCenterCode: string | null;
  departmentHeadId: number | null;
  parentOrgId: number | null;
  effectiveDate: string;
  expirationDate: string;
};

type EmployeeOption = { id: number; name: string; code: string };

export function CorrectOrgVersionForm({
  orgId,
  version,
  parentOptions,
  employees,
}: {
  orgId: number;
  version: OrgVersionFormData;
  parentOptions: ParentOrgOption[];
  employees: EmployeeOption[];
}) {
  const [effectiveDate, setEffectiveDate] = useState(version.effectiveDate);
  const [parentOrgId, setParentOrgId] = useState(
    version.parentOrgId ? String(version.parentOrgId) : "",
  );

  return (
    <ActionForm action={editOrgVersionAction} submitLabel="保存更正">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="versionId" value={version.id} />
      <p className="text-xs text-muted">
        用于修正当前版本中的录入错误；如调整生效时间，系统会自动重算相邻版本失效时间。
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="生效时间 *">
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
        <Field label="失效时间" hint="系统自动计算，不可手工修改">
          <Input
            type="date"
            value={version.expirationDate}
            readOnly
            className="bg-surface/60 text-muted cursor-not-allowed"
          />
        </Field>
        <Field label="组织名称 *">
          <Input name="name" defaultValue={version.name} required />
        </Field>
        <Field label="组织类型 *">
          <Select name="orgType" defaultValue={version.orgType ?? ""} required>
            <option value="">—</option>
            {optionsOf(ORG_TYPES).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="费用编码">
          <Input name="costCenterCode" defaultValue={version.costCenterCode ?? ""} />
        </Field>
        <Field label="部门负责人">
          <Select name="departmentHeadId" defaultValue={version.departmentHeadId ?? ""}>
            <option value="">—</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name} ({employee.code})</option>
            ))}
          </Select>
        </Field>
        <Field label="上级组织 *" hint="仅展示所选生效日期当天有效的组织。">
          <OrganizationParentSelector
            parentOptions={parentOptions}
            effectiveDate={effectiveDate}
            value={parentOrgId}
            onChange={setParentOrgId}
            required
          />
        </Field>
      </div>
    </ActionForm>
  );
}

export function OrgChangeVersionForm({
  orgId,
  baseVersion,
  parentOptions,
  employees,
}: {
  orgId: number;
  baseVersion: OrgVersionFormData | null;
  parentOptions: ParentOrgOption[];
  employees: EmployeeOption[];
}) {
  const [effectiveDate, setEffectiveDate] = useState("");
  const [parentOrgId, setParentOrgId] = useState("");
  const parentSelectDisabled = !effectiveDate;

  return (
    <ActionForm action={addOrgVersionAction} submitLabel="新增生效版本">
      <input type="hidden" name="orgId" value={orgId} />
      <p className="text-xs text-muted">
        用于从指定生效日期起创建新的组织版本，保留历史版本。
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="生效时间 *">
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
        <Field label="失效时间" hint="系统自动计算，默认最新版本为 9999-12-31">
          <Input
            type="date"
            defaultValue="9999-12-31"
            readOnly
            className="bg-surface/60 text-muted cursor-not-allowed"
          />
        </Field>
        <Field label="组织名称 *">
          <Input name="name" defaultValue={baseVersion?.name ?? ""} required />
        </Field>
        <Field label="组织类型 *">
          <Select name="orgType" defaultValue={baseVersion?.orgType ?? ""} required>
            <option value="">—</option>
            {optionsOf(ORG_TYPES).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="费用编码">
          <Input name="costCenterCode" defaultValue={baseVersion?.costCenterCode ?? ""} />
        </Field>
        <Field label="部门负责人">
          <Select name="departmentHeadId" defaultValue={baseVersion?.departmentHeadId ?? ""}>
            <option value="">—</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name} ({employee.code})</option>
            ))}
          </Select>
        </Field>
        <Field
          label="上级组织 *"
          hint={
            parentSelectDisabled
              ? "请先选择生效时间，再选择该日期有效的上级组织。"
              : "仅展示所选生效日期当天有效的组织，并按组织树展示。"
          }
        >
          <OrganizationParentSelector
            parentOptions={parentOptions}
            effectiveDate={effectiveDate}
            value={parentOrgId}
            onChange={setParentOrgId}
            required
          />
        </Field>
      </div>
    </ActionForm>
  );
}
