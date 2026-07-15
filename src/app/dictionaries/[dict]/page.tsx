import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { countryNameCode } from "@/lib/types";
import { DICT_CONFIG, isDictSlug, resolveModel } from "./config";
import { DictForm } from "./form";

export default async function DictionaryPage({
  params,
}: {
  params: Promise<{ dict: string }>;
}) {
  const { dict } = await params;
  if (!isDictSlug(dict)) notFound();
  const cfg = DICT_CONFIG[dict];

  const needsCountry = cfg.fields.some((f) => f.kind === "country");
  const [rows, countries] = await Promise.all([
    resolveModel(dict).findMany({ where: { deletedAt: null }, orderBy: { id: "desc" } }),
    needsCountry
      ? prisma.country.findMany({ where: { deletedAt: null }, orderBy: { country_name: "asc" } })
      : Promise.resolve([]),
  ]);

  const countryName = (id: unknown) => {
    if (!id) return "—";
    const c = countries.find((x) => x.id === Number(id));
    return c ? countryNameCode(c.country_name, c.country_code) : "—";
  };

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                {cfg.columns.map((c) => (
                  <th key={c.field} className="px-4 py-3 font-medium">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={cfg.columns.length}>
                    No entries yet.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => {
                const row = r as Record<string, unknown>;
                return (
                  <tr key={i} className="trow border-b border-line/60">
                    {cfg.columns.map((c) => {
                      let cell: React.ReactNode = String(row[c.field] ?? "—");
                      if (c.field === "country") cell = countryName(row.country_id);
                      else if (c.field.includes("code"))
                        cell = <Badge tone="indigo">{String(row[c.field] ?? "—")}</Badge>;
                      return (
                        <td key={c.field} className="px-4 py-2.5">
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Add new</h3>
          <DictForm slug={dict} fields={cfg.fields} countries={countries} />
        </Card>
      </div>
    </div>
  );
}
