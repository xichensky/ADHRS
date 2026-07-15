"use client";

import { useState } from "react";
import { ActionForm, Field, Input, Select } from "@/components/ui";
import { JOB_LEVELS, optionsOf } from "@/lib/types";
import {
  OrganizationParentSelector,
  type ParentOrgOption,
} from "../../organizations/OrganizationParentSelector";
import { addPositionVersionAction, editPositionVersionAction } from "../actions";

export type PositionVersionFormData = {
  id: number;
  name: string;
  jobLevel: string | null;
  orgId: number | null;
  effectiveDate: string;
  expirationDate: string;
};

function PositionFields({
  mode,
  version,
  orgOptions,
}: {
  mode: "edit" | "add";
  version: PositionVersionFormData | null;
  orgOptions: ParentOrgOption[];
}) {
  const [effectiveDate, setEffectiveDate] = useState(mode === "edit" ? version?.effectiveDate ?? "" : "");
  const [orgId, setOrgId] = useState(mode === "edit" && version?.orgId ? String(version.orgId) : "");

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="生效时间 *">
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
      <Field label="失效时间" hint="系统自动计算，不可手工修改">
        <Input
          type="date"
          value={version?.expirationDate ?? "9999-12-31"}
          readOnly
          className="bg-surface/60 text-muted cursor-not-allowed"
        />
      </Field>
      <Field label="职位名称 *">
        <Input name="name" defaultValue={version?.name ?? ""} required />
      </Field>
      <Field label="Job level *">
        <Select name="jobLevel" defaultValue={version?.jobLevel ?? ""} required>
          <option value="">—</option>
          {optionsOf(JOB_LEVELS).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </Field>
      <Field
        label="所属组织 *"
        hint={
          effectiveDate
            ? "仅展示所选生效日期当天有效的组织。"
            : "请先选择生效时间，再选择该日期有效的组织。"
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
  );
}

export function CorrectPositionVersionForm({
  positionId,
  version,
  orgOptions,
}: {
  positionId: number;
  version: PositionVersionFormData;
  orgOptions: ParentOrgOption[];
}) {
  return (
    <ActionForm action={editPositionVersionAction} submitLabel="保存更正">
      <input type="hidden" name="positionId" value={positionId} />
      <input type="hidden" name="versionId" value={version.id} />
      <p className="text-xs text-muted">
        用于修正当前版本中的录入错误；如调整生效时间，系统会自动重算相邻版本失效时间。
      </p>
      <PositionFields mode="edit" version={version} orgOptions={orgOptions} />
    </ActionForm>
  );
}

export function PositionChangeVersionForm({
  positionId,
  baseVersion,
  orgOptions,
}: {
  positionId: number;
  baseVersion: PositionVersionFormData | null;
  orgOptions: ParentOrgOption[];
}) {
  return (
    <ActionForm action={addPositionVersionAction} submitLabel="新增生效版本">
      <input type="hidden" name="positionId" value={positionId} />
      <p className="text-xs text-muted">
        用于从指定生效日期起创建新的职位版本，保留历史版本。
      </p>
      <PositionFields mode="add" version={baseVersion} orgOptions={orgOptions} />
    </ActionForm>
  );
}
