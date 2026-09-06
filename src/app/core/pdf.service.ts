import { Injectable } from "@angular/core";
import * as pdfMakeImport from "pdfmake/build/pdfmake";
import vfs from "pdfmake/build/vfs_fonts";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { robotoBoldBase64 } from "./roboto-bold";
import { labelsFor } from "./cv-labels";
import type { CoverLetter, CvStyleVariant, GeneratedCv } from "./models";

type PdfMake = typeof pdfMakeImport;

// esbuild envuelve el bundle CommonJS (UMD) de pdfmake bajo `default`.
const pdfMake: PdfMake =
  (pdfMakeImport as { default?: PdfMake }).default ?? pdfMakeImport;

// Añade Roboto-Bold (el bundle de pdfmake solo trae Regular/Medium/Italic)
// para que los textos en negrita se vean realmente en negrita.
pdfMake.addVirtualFileSystem({ ...vfs, "Roboto-Bold.ttf": robotoBoldBase64 });
pdfMake.setFonts({
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Bold.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
});

// Variantes sobrias y ATS-friendly: una sola columna, texto seleccionable y sin gráficos complejos.
const INK = "#1a1a1a";
const GRAY = "#555555";
const LINE = "#d6d6d6";

interface CvPdfTheme {
  margins: [number, number, number, number];
  fontSize: number;
  lineHeight: number;
  nameSize: number;
  titleSize: number;
  sectionSize: number;
  entrySize: number;
  metaSize: number;
  ink: string;
  gray: string;
  line: string;
  sectionSpacing: number;
  sectionCase?: "uppercase";
}

const CV_PDF_THEMES: Record<CvStyleVariant, CvPdfTheme> = {
  classic: {
    margins: [40, 44, 40, 44],
    fontSize: 9.5,
    lineHeight: 1.28,
    nameSize: 22,
    titleSize: 12,
    sectionSize: 10,
    entrySize: 10,
    metaSize: 8.5,
    ink: INK,
    gray: GRAY,
    line: LINE,
    sectionSpacing: 16,
    sectionCase: "uppercase",
  },
  compact: {
    margins: [34, 34, 34, 34],
    fontSize: 8.9,
    lineHeight: 1.18,
    nameSize: 19,
    titleSize: 10.5,
    sectionSize: 9.4,
    entrySize: 9.3,
    metaSize: 8,
    ink: "#111111",
    gray: "#505050",
    line: "#cfcfcf",
    sectionSpacing: 11,
    sectionCase: "uppercase",
  },
  executive: {
    margins: [48, 48, 48, 48],
    fontSize: 10,
    lineHeight: 1.34,
    nameSize: 24,
    titleSize: 12.5,
    sectionSize: 10.5,
    entrySize: 10.3,
    metaSize: 8.8,
    ink: "#111827",
    gray: "#4b5563",
    line: "#9ca3af",
    sectionSpacing: 18,
    sectionCase: "uppercase",
  },
  modern: {
    margins: [40, 40, 40, 40],
    fontSize: 9.7,
    lineHeight: 1.3,
    nameSize: 23,
    titleSize: 12,
    sectionSize: 10.2,
    entrySize: 10,
    metaSize: 8.5,
    ink: "#0f172a",
    gray: "#475569",
    line: "#94a3b8",
    sectionSpacing: 15,
  },
  academic: {
    margins: [46, 50, 46, 50],
    fontSize: 10,
    lineHeight: 1.36,
    nameSize: 21,
    titleSize: 11.5,
    sectionSize: 10.6,
    entrySize: 10.2,
    metaSize: 8.8,
    ink: "#1f1f1f",
    gray: "#555555",
    line: "#b8b8b8",
    sectionSpacing: 17,
  },
};

const A4_WIDTH = 595.28;

const normalizeUrl = (url: string): string => {
  const u = url.trim();
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
};

const rule = (
  width: number,
  margin: [number, number, number, number] = [0, 0, 0, 8],
  lineColor = LINE,
): Content => ({
  canvas: [
    {
      type: "line",
      x1: 0,
      y1: 0,
      x2: width,
      y2: 0,
      lineWidth: 0.7,
      lineColor,
    },
  ],
  margin,
});

@Injectable({ providedIn: "root" })
export class PdfService {
  private build(doc: TDocumentDefinitions): Promise<number[]> {
    const created = pdfMake.createPdf(doc);
    return created.getBuffer().then((buf) => {
      // SAFETY: pdfmake entrega un Buffer/Uint8Array en runtime; sus tipos no exponen esa forma exacta.
      const bytes = buf as unknown as Uint8Array;
      return Array.from(bytes);
    });
  }

  buildCv(
    cv: GeneratedCv,
    variant: CvStyleVariant = "classic",
  ): Promise<number[]> {
    const labels = labelsFor(cv.language);
    const theme = CV_PDF_THEMES[variant];
    const ruleWidth = A4_WIDTH - theme.margins[0] - theme.margins[2];
    const themedRule = (
      margin: [number, number, number, number] = [0, 0, 0, 8],
    ): Content => rule(ruleWidth, margin, theme.line);
    const sectionHeaderText = (text: string): string =>
      theme.sectionCase === "uppercase" ? text.toUpperCase() : text;
    const content: Content[] = [];

    // Cabecera.
    content.push({ text: cv.fullName || labels.resume, style: "name" });
    if (cv.jobTitle) content.push({ text: cv.jobTitle, style: "jobTitle" });

    const contactItems: Content[] = [];
    const addPlain = (v: string) => {
      if (v) contactItems.push(v);
    };
    addPlain(cv.email);
    addPlain(cv.phone);
    addPlain(cv.location);
    if (cv.linkedin) {
      contactItems.push({
        text: "LinkedIn",
        link: normalizeUrl(cv.linkedin),
        style: "link",
      });
    }
    if (cv.website) {
      contactItems.push({
        text: labels.portfolio,
        link: normalizeUrl(cv.website),
        style: "link",
      });
    }

    if (contactItems.length) {
      const flat: Content[] = [];
      contactItems.forEach((item, i) => {
        if (i > 0) flat.push("   |   ");
        flat.push(item);
      });
      content.push({ text: flat, style: "contact" });
    }

    content.push(themedRule([0, 2, 0, 12]));

    if (cv.summary) {
      content.push({
        text: sectionHeaderText(labels.summary),
        style: "sectionHeader",
      });
      content.push(themedRule());
      content.push({ text: cv.summary, style: "body", margin: [0, 8, 0, 0] });
    }

    if (cv.experiences.length) {
      content.push({
        text: sectionHeaderText(labels.experience),
        style: "sectionHeader",
      });
      content.push(themedRule());
      for (const e of cv.experiences) {
        content.push({
          columns: [
            {
              text: `${e.role || labels.role} — ${e.company || labels.company}`,
              style: "entryTitle",
            },
            {
              text: this.dateRange(
                e.startDate,
                e.endDate,
                e.current,
                labels.current,
              ),
              style: "date",
              alignment: "right",
            },
          ],
          margin: [0, 8, 0, 0],
        });
        if (e.location) {
          content.push({
            text: e.location,
            style: "meta",
            margin: [0, 1, 0, 0],
          });
        }
        for (const item of this.asList(e.description)) {
          content.push({
            text: `•  ${item}`,
            style: "body",
            margin: [8, 3, 0, 0],
          });
        }
      }
    }

    if (cv.education.length) {
      content.push({
        text: sectionHeaderText(labels.education),
        style: "sectionHeader",
      });
      content.push(themedRule());
      for (const e of cv.education) {
        content.push({
          columns: [
            {
              text: `${e.degree || labels.degree} — ${e.institution || labels.institution}`,
              style: "entryTitle",
            },
            {
              text: this.dateRange(
                e.startDate,
                e.endDate,
                false,
                labels.current,
              ),
              style: "date",
              alignment: "right",
            },
          ],
          margin: [0, 8, 0, 0],
        });
        if (e.field) {
          content.push({ text: e.field, style: "meta", margin: [0, 1, 0, 0] });
        }
      }
    }

    if (cv.skills.length) {
      content.push({
        text: sectionHeaderText(labels.skills),
        style: "sectionHeader",
      });
      content.push(themedRule());
      content.push({
        text: cv.skills.join(", "),
        style: "body",
        margin: [0, 8, 0, 0],
      });
    }

    if (cv.languages.length) {
      content.push({
        text: sectionHeaderText(labels.languages),
        style: "sectionHeader",
      });
      content.push(themedRule());
      content.push({
        text: cv.languages
          .map((l) =>
            typeof l === "string"
              ? l
              : l.level
                ? `${l.name} (${l.level})`
                : l.name,
          )
          .join(", "),
        style: "body",
        margin: [0, 8, 0, 0],
      });
    }

    if (cv.certifications.length) {
      content.push({
        text: sectionHeaderText(labels.certifications),
        style: "sectionHeader",
      });
      content.push(themedRule());
      content.push({
        text: cv.certifications
          .map((c) => {
            if (typeof c === "string") return c;
            const meta = [c.issuer, c.date].filter(Boolean).join(", ");
            return meta ? `${c.name} (${meta})` : c.name;
          })
          .join(", "),
        style: "body",
        margin: [0, 8, 0, 0],
      });
    }

    if (cv.projects.length) {
      content.push({
        text: sectionHeaderText(labels.projects),
        style: "sectionHeader",
      });
      content.push(themedRule());
      for (const p of cv.projects) {
        content.push({
          text: p.name,
          style: "entryTitle",
          margin: [0, 8, 0, 0],
        });
        if (p.description) {
          content.push({
            text: p.description,
            style: "body",
            margin: [0, 4, 0, 0],
          });
        }
      }
    }

    return this.build({
      pageSize: "A4",
      pageMargins: theme.margins,
      defaultStyle: {
        font: "Roboto",
        fontSize: theme.fontSize,
        color: theme.ink,
        lineHeight: theme.lineHeight,
      },
      content,
      styles: {
        name: {
          fontSize: theme.nameSize,
          bold: true,
          color: theme.ink,
          margin: [0, 0, 0, 2],
        },
        jobTitle: {
          fontSize: theme.titleSize,
          color: theme.gray,
          margin: [0, 0, 0, 6],
        },
        contact: {
          fontSize: theme.metaSize,
          color: theme.gray,
          margin: [0, 0, 0, 6],
        },
        link: { color: theme.gray, decoration: "underline" },
        sectionHeader: {
          fontSize: theme.sectionSize,
          bold: true,
          color: theme.ink,
          characterSpacing: theme.sectionCase === "uppercase" ? 1.5 : 0,
          margin: [0, theme.sectionSpacing, 0, 3],
        },
        body: { fontSize: theme.fontSize, color: theme.ink },
        meta: { fontSize: theme.metaSize, color: theme.gray },
        date: { fontSize: theme.metaSize, color: theme.gray },
        entryTitle: { fontSize: theme.entrySize, bold: true, color: theme.ink },
      },
    });
  }

  buildCoverLetter(letter: CoverLetter): Promise<number[]> {
    const content: Content[] = [];
    if (letter.subject) content.push({ text: letter.subject, style: "name" });
    if (letter.greeting)
      content.push({
        text: letter.greeting,
        style: "body",
        margin: [0, 18, 0, 0],
      });

    for (const para of letter.body
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean)) {
      content.push({ text: para, style: "body", margin: [0, 10, 0, 0] });
    }

    if (letter.closing)
      content.push({
        text: letter.closing,
        style: "body",
        margin: [0, 18, 0, 0],
      });

    return this.build({
      pageSize: "A4",
      pageMargins: [50, 50, 50, 50],
      defaultStyle: {
        font: "Roboto",
        fontSize: 11,
        color: INK,
        lineHeight: 1.45,
      },
      content,
      styles: {
        name: { fontSize: 18, bold: true, color: INK },
        body: { fontSize: 11, color: INK },
      },
    });
  }

  private dateRange(
    start: string,
    end: string,
    current: boolean,
    currentLabel: string,
  ): string {
    const e = current ? currentLabel : end;
    if (!start && !e) return "";
    if (!start) return e;
    if (!e) return start;
    return `${start} – ${e}`;
  }

  private asList(desc: string | string[]): string[] {
    if (Array.isArray(desc)) return desc;
    if (desc && desc.trim()) return [desc];
    return [];
  }
}
