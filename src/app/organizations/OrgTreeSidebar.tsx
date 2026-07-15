"use client";

import { useState } from "react";
import Link from "next/link";

export type OrgTreeItem = {
  id: number;
  name: string;
  code: string;
  children: OrgTreeItem[];
};

function TreeNode({
  node,
  selectedId,
  depth,
  defaultExpanded,
  asOf,
}: {
  node: OrgTreeItem;
  selectedId: number | null;
  depth: number;
  defaultExpanded: boolean;
  asOf: string;
}) {
  const [open, setOpen] = useState(defaultExpanded || depth === 0);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded px-1 py-[3px] text-[13px] cursor-pointer select-none ${
          isSelected
            ? "bg-accent/15 text-accent font-medium"
            : "text-foreground hover:bg-surface"
        }`}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-4 shrink-0 text-center text-muted"
        >
          {hasChildren ? (open ? "▾" : "▸") : ""}
        </button>

        {/* Org icon + name */}
        <Link
          href={`/organizations?orgId=${node.id}&asOf=${asOf}`}
          className="flex min-w-0 items-center gap-1 flex-1 truncate"
          onClick={() => {
            // Toggle expand if has children and not yet expanded
            if (hasChildren && !open) {
              setOpen(true);
            }
          }}
        >
          <span className="shrink-0 text-[10px] text-muted/60">
            {depth === 0 ? "🏢" : "🏬"}
          </span>
          <span className="truncate">{node.name}</span>
        </Link>
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              depth={depth + 1}
              defaultExpanded={false}
              asOf={asOf}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgTreeSidebar({
  roots,
  selectedId,
  asOf,
}: {
  roots: OrgTreeItem[];
  selectedId: number | null;
  asOf: string;
}) {
  return (
    <div className="space-y-0.5">
      {roots.map((root) => (
        <TreeNode
          key={root.id}
          node={root}
          selectedId={selectedId}
          depth={0}
          defaultExpanded={true}
          asOf={asOf}
        />
      ))}
    </div>
  );
}
