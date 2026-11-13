import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

/** A workbook as plain data: sheet name → rows → cell text ("" for empty cells). */
export type Workbook = Record<string, string[][]>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  htmlEntities: true,
  isArray: (name) => ["sheet", "row", "c", "si", "r", "Relationship"].includes(name),
});

/** Text of a <t> node, which the parser gives as a string or as { "#text", attrs }. */
function textOf(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in node) {
    return String((node as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

/** Text of a shared-string or inline-string item: plain <t> or rich-text runs <r><t>. */
function stringItem(item: any): string {
  if (item == null) return "";
  if (item.r) return (item.r as any[]).map((run) => textOf(run.t)).join("");
  return textOf(item.t);
}

/** "C7" → 2 */
function columnIndex(cellRef: string): number {
  let n = 0;
  for (const ch of cellRef) {
    if (ch < "A" || ch > "Z") break;
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

export function parseXlsx(bytes: Uint8Array): Workbook {
  const zip = unzipSync(bytes);
  const read = (path: string): any => {
    const file = zip[path];
    if (!file) throw new Error(`xlsx: missing part ${path}`);
    return parser.parse(strFromU8(file));
  };

  const shared: string[] = zip["xl/sharedStrings.xml"]
    ? ((read("xl/sharedStrings.xml").sst?.si ?? []) as any[]).map(stringItem)
    : [];

  const targets = new Map<string, string>();
  for (const rel of read("xl/_rels/workbook.xml.rels").Relationships.Relationship as any[]) {
    targets.set(rel["@_Id"], rel["@_Target"]);
  }

  const workbook: Workbook = {};
  for (const sheet of read("xl/workbook.xml").workbook.sheets.sheet as any[]) {
    const target = targets.get(sheet["@_r:id"]);
    if (!target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    const rows: string[][] = [];
    for (const row of (read(path).worksheet.sheetData?.row ?? []) as any[]) {
      const cells: string[] = [];
      for (const c of (row.c ?? []) as any[]) {
        const type = c["@_t"];
        let value: string;
        if (type === "s") value = shared[Number(textOf(c.v))] ?? "";
        else if (type === "inlineStr") value = stringItem(c.is);
        else value = textOf(c.v);
        const col = columnIndex(String(c["@_r"] ?? ""));
        if (col >= 0) cells[col] = value;
      }
      const dense = Array.from(cells, (v) => (v ?? "").trim());
      if (dense.some((v) => v !== "")) rows.push(dense);
    }
    workbook[String(sheet["@_name"])] = rows;
  }
  return workbook;
}

export function readXlsx(path: string): Workbook {
  return parseXlsx(readFileSync(path));
}
