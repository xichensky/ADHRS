// Config for the 5 simple dictionary collections (country/bank/currency/
// id_document_type/legal_entity_register_number_type). Location has its own page.

import { prisma } from "@/lib/prisma";

export type DictSlug =
  | "countries"
  | "banks"
  | "currencies"
  | "id-document-types"
  | "register-number-types";

export type FieldKind = "text" | "textarea" | "country";
export interface DictField {
  name: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
}

export interface DictConfig {
  title: string;
  subtitle: string;
  fields: DictField[];
  /** columns to show in the list (field name -> header) */
  columns: { field: string; header: string }[];
}

export const DICT_CONFIG: Record<DictSlug, DictConfig> = {
  countries: {
    title: "Countries",
    subtitle: "Country dictionary (code + name). country_name_code is computed.",
    fields: [
      { name: "country_code", label: "Code", required: true },
      { name: "country_name", label: "Name", required: true },
    ],
    columns: [
      { field: "country_code", header: "Code" },
      { field: "country_name", header: "Name" },
    ],
  },
  banks: {
    title: "Banks",
    subtitle: "Bank dictionary scoped by country.",
    fields: [
      { name: "bank_code", label: "Code", required: true },
      { name: "bank_name", label: "Name", required: true },
      { name: "bank_name_short", label: "Short Name" },
      { name: "country_id", label: "Country", kind: "country" },
    ],
    columns: [
      { field: "bank_code", header: "Code" },
      { field: "bank_name", header: "Name" },
      { field: "country", header: "Country" },
    ],
  },
  currencies: {
    title: "Currencies",
    subtitle: "Currency dictionary.",
    fields: [
      { name: "currency_code", label: "Code", required: true },
      { name: "currency_name", label: "Name", required: true },
      { name: "symbol", label: "Symbol" },
    ],
    columns: [
      { field: "currency_code", header: "Code" },
      { field: "currency_name", header: "Name" },
      { field: "symbol", header: "Symbol" },
    ],
  },
  "id-document-types": {
    title: "ID Document Types",
    subtitle: "Identity-document-type dictionary scoped by country.",
    fields: [
      { name: "document_type_name", label: "Name", required: true },
      { name: "country_id", label: "Country", kind: "country" },
    ],
    columns: [
      { field: "document_type_name", header: "Name" },
      { field: "country", header: "Country" },
    ],
  },
  "register-number-types": {
    title: "Register Number Types",
    subtitle: "Legal-entity register-number-type dictionary scoped by country.",
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "name", label: "Name", required: true },
      { name: "description", label: "Description", kind: "textarea" },
      { name: "country_id", label: "Country", kind: "country" },
    ],
    columns: [
      { field: "code", header: "Code" },
      { field: "name", header: "Name" },
      { field: "country", header: "Country" },
    ],
  },
};

export function isDictSlug(s: string): s is DictSlug {
  return s in DICT_CONFIG;
}

// Loosely-typed model delegate per slug.
type Delegate = {
  findMany: (a: unknown) => Promise<Record<string, unknown>[]>;
  create: (a: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (a: { where: { id: number }; data: Record<string, unknown> }) => Promise<unknown>;
};

export function resolveModel(slug: DictSlug): Delegate {
  switch (slug) {
    case "countries":
      return prisma.country as unknown as Delegate;
    case "banks":
      return prisma.bank as unknown as Delegate;
    case "currencies":
      return prisma.currency as unknown as Delegate;
    case "id-document-types":
      return prisma.id_document_type as unknown as Delegate;
    case "register-number-types":
      return prisma.legal_entity_register_number_type as unknown as Delegate;
  }
}
