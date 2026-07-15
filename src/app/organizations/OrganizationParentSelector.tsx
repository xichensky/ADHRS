"use client";

import { useMemo, useState } from "react";

export type ParentOrgOption = {
  id: number;
  name: string;
  code: string;
  versions: Array<{
    name: string;
    parentOrgId: number | null;
    effectiveDate: string;
    expirationDate: string | null;
  }>;
};

type ActiveParentOrg = {
  id: number;
  name: string;
  code: string;
  parentOrgId: number | null;
};

type TreeParentOption = {
  id: number;
  name: string;
  code: string;
  level: number;
};

function getActiveVersion(option: ParentOrgOption, effectiveDate: string) {
  if (!effectiveDate) return null;

  for (let i = option.versions.length - 1; i >= 0; i -= 1) {
    const version = option.versions[i];
    if (
      version.effectiveDate <= effectiveDate &&
      (!version.expirationDate || version.expirationDate >= effectiveDate)
    ) {
      return version;
    }
  }

  return null;
}

function compareActiveOrgs(a: ActiveParentOrg, b: ActiveParentOrg): number {
  return a.name.localeCompare(b.name) || a.code.localeCompare(b.code) || a.id - b.id;
}

function buildTreeParentOptions(
  parentOptions: ParentOrgOption[],
  effectiveDate: string,
): TreeParentOption[] {
  const activeParents = parentOptions
    .map((option): ActiveParentOrg | null => {
      const version = getActiveVersion(option, effectiveDate);
      if (!version) return null;
      return {
        id: option.id,
        name: version.name || option.name,
        code: option.code,
        parentOrgId: version.parentOrgId,
      };
    })
    .filter((option): option is ActiveParentOrg => option !== null);

  const orgMap = new Map(activeParents.map((option) => [option.id, option]));
  const childrenMap = new Map<number | null, ActiveParentOrg[]>();
  for (const option of activeParents) {
    const parentId = option.parentOrgId && orgMap.has(option.parentOrgId)
      ? option.parentOrgId
      : null;
    const siblings = childrenMap.get(parentId) ?? [];
    siblings.push(option);
    childrenMap.set(parentId, siblings);
  }

  for (const siblings of childrenMap.values()) {
    siblings.sort(compareActiveOrgs);
  }

  const flattened: TreeParentOption[] = [];
  const visited = new Set<number>();

  function append(option: ActiveParentOrg, level: number) {
    if (visited.has(option.id)) return;
    visited.add(option.id);
    flattened.push({ id: option.id, name: option.name, code: option.code, level });
    for (const child of childrenMap.get(option.id) ?? []) {
      append(child, level + 1);
    }
  }

  for (const root of childrenMap.get(null) ?? []) {
    append(root, 0);
  }

  for (const option of activeParents.sort(compareActiveOrgs)) {
    append(option, 0);
  }

  return flattened;
}

export function OrganizationParentSelector({
  parentOptions,
  effectiveDate,
  value,
  onChange,
  name = "parentOrgId",
  disabled = false,
  required = false,
  requiredMessage = "Parent organization is required.",
}: {
  parentOptions: ParentOrgOption[];
  effectiveDate: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  requiredMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const treeParentOptions = useMemo(
    () => buildTreeParentOptions(parentOptions, effectiveDate),
    [effectiveDate, parentOptions],
  );
  const selected = treeParentOptions.find((option) => String(option.id) === value) ?? null;
  const selectedParentIsEligible = selected !== null;
  const submittedParentOrgId = effectiveDate && selectedParentIsEligible ? value : "";
  const isDisabled = disabled || !effectiveDate;

  return (
    <div className="relative">
      <input
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        required={required && !isDisabled}
        value={submittedParentOrgId}
        onChange={() => {}}
        onInvalid={(event) => {
          event.currentTarget.setCustomValidity(requiredMessage);
        }}
        onInput={(event) => {
          event.currentTarget.setCustomValidity("");
        }}
      />
      <input type="hidden" name={name} value={submittedParentOrgId} />
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-left text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          isDisabled ? "cursor-not-allowed bg-surface/60 text-muted" : "text-foreground hover:border-accent/50"
        } ${required && effectiveDate && !submittedParentOrgId ? "border-amber-300" : ""}`}
      >
        <span className={selected ? "truncate" : "truncate text-muted"}>
          {selected ? `${selected.name} (${selected.code})` : "请选择上级组织"}
        </span>
        <span className="ml-2 text-xs text-muted">{open ? "▴" : "▾"}</span>
      </button>

      {open && !isDisabled && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="flex w-full items-center px-3 py-2 text-left text-muted hover:bg-surface"
          >
            —
          </button>
          {treeParentOptions.length === 0 ? (
            <div className="px-3 py-2 text-muted">该生效日期无可选上级组织</div>
          ) : (
            treeParentOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={(event) => {
                  onChange(String(option.id));
                  event.currentTarget.form?.querySelector<HTMLInputElement>("input[aria-hidden='true']")?.setCustomValidity("");
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent/10 ${
                  String(option.id) === submittedParentOrgId ? "bg-accent/10 text-accent" : "text-foreground"
                }`}
                style={{ paddingLeft: option.level * 18 + 12 }}
              >
                <span className="text-[10px] text-muted/70">{option.level === 0 ? "🏢" : "└"}</span>
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                <span className="shrink-0 text-xs text-muted">{option.code}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
