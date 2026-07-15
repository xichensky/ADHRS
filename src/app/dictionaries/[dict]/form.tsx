"use client";

import { ActionForm, Field, Input, Textarea, Select } from "@/components/ui";
import { createDictEntry } from "./actions";
import type { DictField } from "./config";

export function DictForm({
  slug,
  fields,
  countries,
}: {
  slug: string;
  fields: DictField[];
  countries: { id: number; country_name: string; country_code: string }[];
}) {
  return (
    <ActionForm action={createDictEntry} submitLabel="Add entry">
      <input type="hidden" name="__dict" value={slug} />
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <Field key={f.name} label={f.label + (f.required ? " *" : "")}>
            {f.kind === "textarea" ? (
              <Textarea name={f.name} />
            ) : f.kind === "country" ? (
              <Select name={f.name}>
                <option value="">—</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.country_name} ({c.country_code})
                  </option>
                ))}
              </Select>
            ) : (
              <Input name={f.name} />
            )}
          </Field>
        ))}
      </div>
    </ActionForm>
  );
}
