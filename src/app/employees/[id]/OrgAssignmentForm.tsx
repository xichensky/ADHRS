"use client";

// Event-driven "Add version" form (用友 "异动" entry point).
// The user first picks the 任职事件 (Onboard/Transfer/Offboard/...); the event then
// drives which fields are relevant. The selected event_type is written onto the new
// org_assignment version row, making the timeline self-describing.

import { useState } from "react";
import { ActionForm, Field, Input, Select } from "@/components/ui";
import { EMPLOYMENT_TYPES, ORG_EVENT_TYPES, optionsOf } from "@/lib/types";
import { addOrgAssignmentAction } from "../actions";

type RefOption = { id: number; name: string };

export function OrgAssignmentForm({
  employeeId,
  currentVersion,
  orgs,
  positions,
  employees,
}: {
  employeeId: number;
  currentVersion: {
    orgId: number | null;
    positionId: number | null;
    secondaryPositionId: number | null;
    reportToEmployeeId: number | null;
    employmentType: string | null;
    officeLocation: string | null;
    workLocation: string | null;
  } | null;
  orgs: RefOption[];
  positions: RefOption[];
  employees: RefOption[];
}) {
  // Default to the most common "add version" action so the assignment fields are
  // visible immediately; the user can switch to Offboard/Retire/etc.
  const [eventType, setEventType] = useState<string>("Transfer");

  // Offboard / Retire end the assignment — hide the org/position/leader/location block.
  const endsAssignment = eventType === "Offboard" || eventType === "Retire";
  const showSecondary = eventType === "SecondaryChange";
  const requireOrgPosition =
    eventType === "Transfer" || eventType === "Promotion";

  return (
    <ActionForm action={addOrgAssignmentAction} submitLabel="Add version">
      <input type="hidden" name="employeeId" value={employeeId} />

      <Field label="Event type *">
        <Select
          name="eventType"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          {optionsOf(ORG_EVENT_TYPES).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Event reason"
        hint={
          endsAssignment
            ? "e.g. 辞职 / 合同到期 / 辞退 / 到期退休"
            : "e.g. 主动调动 / 晋升考核 / 组织调整"
        }
      >
        <Input name="eventReason" placeholder="(optional sub-reason)" />
      </Field>

      {eventType === "Probation" && (
        <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
          转正事件：建议将 Employment type 设为正式（Full-time 等）。
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Effective date *">
          <Input
            name="effectiveDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Expiration date">
          <Input name="expirationDate" type="date" />
        </Field>
      </div>

      {!endsAssignment && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Organization"
              hint={requireOrgPosition ? "必填（调动/晋升）" : undefined}
            >
              <Select
                name="orgId"
                defaultValue={currentVersion?.orgId ?? undefined}
              >
                <option value="">—</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Position"
              hint={requireOrgPosition ? "必填（调动/晋升）" : undefined}
            >
              <Select
                name="positionId"
                defaultValue={currentVersion?.positionId ?? undefined}
              >
                <option value="">—</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            {showSecondary && (
              <Field label="Secondary position (兼任)">
                <Select
                  name="secondaryPositionId"
                  defaultValue={currentVersion?.secondaryPositionId ?? undefined}
                >
                  <option value="">—</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Report to">
              <Select
                name="reportToEmployeeId"
                defaultValue={currentVersion?.reportToEmployeeId ?? undefined}
              >
                <option value="">—</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Employment type">
              <Select
                name="employmentType"
                defaultValue={currentVersion?.employmentType ?? undefined}
              >
                <option value="">—</option>
                {optionsOf(EMPLOYMENT_TYPES).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Office location">
              <Input
                name="officeLocation"
                defaultValue={currentVersion?.officeLocation ?? undefined}
              />
            </Field>
            <Field label="Work location">
              <Input
                name="workLocation"
                defaultValue={currentVersion?.workLocation ?? undefined}
              />
            </Field>
          </div>
        </>
      )}
    </ActionForm>
  );
}
