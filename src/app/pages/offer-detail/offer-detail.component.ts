import { CommonModule } from "@angular/common";
import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { AiService } from "../../core/ai.service";
import { DbService } from "../../core/db.service";
import { PdfService } from "../../core/pdf.service";
import { SettingsService } from "../../core/settings.service";
import { ConfirmService } from "../../core/confirm.service";
import { I18nService } from "../../core/i18n.service";
import { TranslatePipe } from "../../core/translate.pipe";
import { parseTechnicalTest as parseTest } from "../../core/test-utils";
import { CvPreviewComponent } from "../../components/cv-preview/cv-preview.component";
import type {
  AtsAnalysis,
  CoverLetter,
  GeneratedCv,
  JobOffer,
  JobOfferStructured,
  OfferStatus,
  TechnicalTest,
} from "../../core/models";

const STATUSES: OfferStatus[] = [
  "guardada",
  "aplicada",
  "entrevista",
  "oferta",
  "rechazada",
];

const LANGUAGES: { value: string; labelKey: string }[] = [
  { value: "", labelKey: "lang.auto" },
  { value: "español", labelKey: "lang.es" },
  { value: "inglés", labelKey: "lang.en" },
  { value: "francés", labelKey: "lang.fr" },
  { value: "alemán", labelKey: "lang.de" },
  { value: "italiano", labelKey: "lang.it" },
  { value: "portugués", labelKey: "lang.pt" },
];

const QUESTION_COUNTS: { value: string; labelKey: string }[] = [
  { value: "", labelKey: "test.auto58" },
  { value: "5", labelKey: "test.5q" },
  { value: "8", labelKey: "test.8q" },
  { value: "10", labelKey: "test.10q" },
];

const DIFFICULTIES: { value: string; labelKey: string }[] = [
  { value: "", labelKey: "test.auto" },
  { value: "junior", labelKey: "test.junior" },
  { value: "medio", labelKey: "test.mid" },
  { value: "senior", labelKey: "test.senior" },
];

const ESTIMATED_TIMES: { value: string; labelKey: string }[] = [
  { value: "", labelKey: "test.auto" },
  { value: "15", labelKey: "test.15m" },
  { value: "30", labelKey: "test.30m" },
  { value: "60", labelKey: "test.60m" },
];

const LANGUAGE_LABEL_KEYS: Record<string, string> = {
  "": "lang.auto",
  español: "lang.es",
  inglés: "lang.en",
  francés: "lang.fr",
  alemán: "lang.de",
  italiano: "lang.it",
  portugués: "lang.pt",
};

interface CvEntry {
  id: number;
  cv: GeneratedCv;
  createdAt: string;
}

@Component({
  selector: "app-offer-detail",
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CvPreviewComponent,
    TranslatePipe,
  ],
  templateUrl: "./offer-detail.component.html",
  styleUrl: "./offer-detail.component.css",
})
export class OfferDetailComponent implements OnInit, OnDestroy {
  offer: JobOffer | null = null;
  structured: JobOfferStructured | null = null;
  statuses = STATUSES;
  languages = LANGUAGES;
  cvLanguage = "";
  letterLanguage = "";

  questionCounts = QUESTION_COUNTS;
  difficulties = DIFFICULTIES;
  estimatedTimes = ESTIMATED_TIMES;
  questionCount = "";
  difficulty = "";
  estimatedTime = "";

  busy = "";
  error = "";
  toast = "";
  toastLeaving = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  get busyCv(): string {
    return this.i18n.t("busy.cv");
  }
  get busyLetter(): string {
    return this.i18n.t("busy.letter");
  }
  get busyTest(): string {
    return this.i18n.t("busy.test");
  }
  get busyAts(): string {
    return this.i18n.t("busy.ats");
  }
  get busyPdf(): string {
    return this.i18n.t("busy.pdf");
  }

  showCvModal = false;
  showLetterModal = false;
  showTestModal = false;

  cvs: CvEntry[] = [];
  previewCv: GeneratedCv | null = null;
  showCvPreview = false;
  editCvId: number | null = null;
  cvDraft: GeneratedCv | null = null;
  showCvEdit = false;
  letter: CoverLetter | null = null;
  letterId: number | null = null;
  editingLetter = false;
  letterDraft: CoverLetter | null = null;
  test: TechnicalTest | null = null;
  ats: AtsAnalysis | null = null;

  notesDraft = "";
  savingNotes = false;

  constructor(
    private route: ActivatedRoute,
    private db: DbService,
    private ai: AiService,
    private settings: SettingsService,
    private pdf: PdfService,
    private confirm: ConfirmService,
    private i18n: I18nService,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    this.offer = (await this.db.getOffer(id)) ?? null;
    if (this.offer) {
      this.structured = this.parseStructured(this.offer.structured);
      this.notesDraft = this.offer.notes;
      const rows = await this.db.listGeneratedCvs(id);
      this.cvs = rows.map((r) => ({
        id: r.id,
        cv: this.parseCv(r.structured),
        createdAt: r.createdAt,
      }));
      const letters = await this.db.listCoverLetters(id);
      if (letters.length) {
        this.letterId = letters[0].id;
        this.letter = this.parseCoverLetter(letters[0].content);
      }
      const tests = await this.db.listTechnicalTests(id);
      if (tests.length) {
        this.test = {
          ...this.parseTechnicalTest(tests[0].content),
          id: tests[0].id,
          jobOfferId: id,
        };
      }
      this.ats = await this.db.getAtsAnalysis(id);
    }
  }

  private parseStructured(raw: string): JobOfferStructured {
    try {
      const v = JSON.parse(raw || "{}");
      return {
        title: v.title ?? "",
        company: v.company ?? "",
        location: v.location ?? "",
        salary: v.salary ?? "",
        jobType: v.jobType ?? "",
        seniority: v.seniority ?? "",
        description: v.description ?? "",
        requirements: v.requirements ?? [],
        responsibilities: v.responsibilities ?? [],
        niceToHave: v.niceToHave ?? [],
        skills: v.skills ?? [],
        applicationUrl: v.applicationUrl ?? "",
      };
    } catch {
      return {
        title: "",
        company: "",
        location: "",
        salary: "",
        jobType: "",
        seniority: "",
        description: "",
        requirements: [],
        responsibilities: [],
        niceToHave: [],
        skills: [],
        applicationUrl: "",
      };
    }
  }

  private emptyCv(): GeneratedCv {
    return {
      fullName: "",
      jobTitle: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
      summary: "",
      experiences: [],
      education: [],
      skills: [],
      languages: [],
      certifications: [],
      projects: [],
    };
  }

  private parseCv(raw: string): GeneratedCv {
    try {
      return { ...this.emptyCv(), ...JSON.parse(raw || "{}") };
    } catch {
      return this.emptyCv();
    }
  }

  private parseCoverLetter(raw: string): CoverLetter {
    try {
      return JSON.parse(raw || "{}");
    } catch {
      return { subject: "", greeting: "", body: "", closing: "" };
    }
  }

  private parseTechnicalTest(content: string): TechnicalTest {
    return parseTest(content);
  }

  splitBody(body: string): string[] {
    return body.split("\n\n").filter((p) => p.trim().length > 0);
  }

  private requireKey(): boolean {
    if (!this.settings.isConfigured) {
      this.error = this.i18n.t("error.configureAi");
      return false;
    }
    return true;
  }

  private clearMessages(): void {
    this.error = "";
    this.toast = "";
    this.toastLeaving = false;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  private showToast(message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = message;
    this.toastLeaving = false;
    this.toastTimer = setTimeout(() => {
      this.toastLeaving = true;
      this.toastTimer = setTimeout(() => {
        this.toast = "";
        this.toastLeaving = false;
        this.toastTimer = null;
      }, 160);
    }, 3200);
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  async changeStatus(): Promise<void> {
    if (this.offer)
      await this.db.updateOfferStatus(this.offer.id, this.offer.status);
  }

  async saveNotes(): Promise<void> {
    if (!this.offer || this.savingNotes) return;
    this.savingNotes = true;
    try {
      await this.db.updateOfferNotes(this.offer.id, this.notesDraft);
      this.offer.notes = this.notesDraft;
      this.showToast(this.i18n.t("offer.notesSaved"));
    } catch (e) {
      this.error = String(e);
    } finally {
      this.savingNotes = false;
    }
  }

  // --- Modales de generación ---
  openCvModal(): void {
    if (this.busy) return;
    this.clearMessages();
    this.showCvModal = true;
  }

  openLetterModal(): void {
    if (this.busy) return;
    this.clearMessages();
    this.showLetterModal = true;
  }

  openTestModal(): void {
    if (this.busy) return;
    this.clearMessages();
    this.showTestModal = true;
  }

  closeModals(): void {
    if (this.busy) return;
    this.showCvModal = false;
    this.showLetterModal = false;
    this.showTestModal = false;
    this.showCvPreview = false;
    this.previewCv = null;
    this.showCvEdit = false;
    this.editCvId = null;
    this.cvDraft = null;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeModals();
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.closeModals();
  }

  async confirmGenerateCv(): Promise<void> {
    if (!this.requireKey() || !this.structured) return;
    this.busy = this.busyCv;
    this.clearMessages();
    try {
      const cvData = await this.db.getCvData();
      const result = await this.ai.generateCv(
        cvData,
        this.structured,
        this.cvLanguage,
      );
      result.language = this.cvLanguage;
      const id = await this.db.addGeneratedCv(
        this.offer!.id,
        JSON.stringify(result),
      );
      this.cvs = [{ id, cv: result, createdAt: "" }, ...this.cvs];
      this.showCvModal = false;
      this.previewCv = result;
      this.showCvPreview = true;
    } catch (e) {
      this.error = String(e);
    } finally {
      this.busy = "";
    }
  }

  // --- Gestión de CVs generados ---
  formatDate(createdAt: string): string {
    if (!createdAt) return "";
    const m = createdAt.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]} · ${m[4]}:${m[5]}`;
    return createdAt;
  }

  cvMeta(entry: CvEntry): string {
    const parts: string[] = [];
    if (entry.cv.language)
      parts.push(
        this.i18n.t(LANGUAGE_LABEL_KEYS[entry.cv.language] ?? "lang.es"),
      );
    if (entry.createdAt) parts.push(this.formatDate(entry.createdAt));
    return parts.join(" · ");
  }

  previewCvEntry(entry: CvEntry): void {
    this.previewCv = entry.cv;
    this.showCvPreview = true;
  }

  startEditCv(entry: CvEntry): void {
    this.editCvId = entry.id;
    this.cvDraft = structuredClone(entry.cv);
    this.showCvEdit = true;
  }

  cancelEditCv(): void {
    this.editCvId = null;
    this.cvDraft = null;
    this.showCvEdit = false;
  }

  async saveCv(): Promise<void> {
    if (!this.cvDraft || this.editCvId == null) return;
    const id = this.editCvId;
    const draft = this.cvDraft;
    const entry = this.cvs.find((c) => c.id === id);
    if (entry) entry.cv = draft;
    this.showCvEdit = false;
    this.editCvId = null;
    this.cvDraft = null;
    try {
      await this.db.updateGeneratedCv(id, JSON.stringify(draft));
      this.showToast(this.i18n.t("offer.cvSaved"));
    } catch (e) {
      this.error = String(e);
    }
  }

  async deleteCv(entry: CvEntry): Promise<void> {
    if (this.busy) return;
    const ok = await this.confirm.confirm({
      title: this.i18n.t("confirm.deleteCvTitle"),
      message: this.i18n.t("confirm.deleteCv"),
      confirmText: this.i18n.t("common.delete"),
    });
    if (!ok) return;
    await this.db.deleteGeneratedCv(entry.id);
    this.cvs = this.cvs.filter((c) => c.id !== entry.id);
  }

  skillsText(value: string[]): string {
    return (value || []).join(", ");
  }

  setSkillsText(value: string): string[] {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  expDesc(desc: string[]): string {
    return (desc || []).join("\n");
  }

  setExpDesc(desc: string[], value: string): void {
    const items = value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    desc.length = 0;
    items.forEach((s) => desc.push(s));
  }

  async confirmGenerateLetter(): Promise<void> {
    if (!this.requireKey() || !this.structured) return;
    this.busy = this.busyLetter;
    this.clearMessages();
    try {
      const cvData = await this.db.getCvData();
      const result = await this.ai.generateCoverLetter(
        cvData,
        this.structured,
        this.letterLanguage,
      );
      this.letter = result;
      this.letterId = await this.db.addCoverLetter(
        this.offer!.id,
        JSON.stringify(result),
      );
      this.editingLetter = false;
      this.showLetterModal = false;
    } catch (e) {
      this.error = String(e);
    } finally {
      this.busy = "";
    }
  }

  startEditLetter(): void {
    if (!this.letter) return;
    this.letterDraft = { ...this.letter };
    this.editingLetter = true;
  }

  cancelEditLetter(): void {
    this.letterDraft = null;
    this.editingLetter = false;
  }

  async saveLetter(): Promise<void> {
    if (!this.letterDraft) return;
    this.letter = { ...this.letterDraft };
    this.editingLetter = false;
    this.letterDraft = null;
    if (this.letterId != null) {
      try {
        await this.db.updateCoverLetter(
          this.letterId,
          JSON.stringify(this.letter),
        );
      } catch (e) {
        this.error = String(e);
      }
    }
  }

  async confirmGenerateTest(): Promise<void> {
    if (!this.requireKey() || !this.structured) return;
    this.busy = this.busyTest;
    this.clearMessages();
    try {
      const result = await this.ai.generateTechnicalTest(this.structured, {
        questionCount: this.questionCount,
        difficulty: this.difficulty,
        estimatedTime: this.estimatedTime,
      });
      const id = await this.db.addTechnicalTest(
        this.offer!.id,
        result.title,
        JSON.stringify(result),
      );
      this.test = { ...result, id, jobOfferId: this.offer!.id };
      this.showTestModal = false;
    } catch (e) {
      this.error = String(e);
    } finally {
      this.busy = "";
    }
  }

  async analyzeAts(): Promise<void> {
    if (!this.requireKey() || !this.structured) return;
    this.busy = this.busyAts;
    this.clearMessages();
    try {
      const cvData = await this.db.getCvData();
      const result = await this.ai.analyzeAts(cvData, this.structured);
      this.ats = result;
      if (this.offer) {
        await this.db.saveAtsAnalysis(this.offer.id, result);
      }
    } catch (e) {
      this.error = String(e);
    } finally {
      this.busy = "";
    }
  }

  async exportCv(cv: GeneratedCv): Promise<void> {
    if (!cv) return;
    this.busy = this.busyPdf;
    this.clearMessages();
    try {
      const path = await save({
        defaultPath: `${cv.fullName || "cv"}-${this.structured?.company || "oferta"}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return;
      const bytes = await this.pdf.buildCv(
        cv,
        this.settings.settings().cvStyle,
      );
      await invoke<string>("save_file", { path, bytes });
      this.showToast(this.i18n.t("offer.cvExported", { path }));
    } catch (e) {
      this.error = String(e);
    } finally {
      this.busy = "";
    }
  }

  async exportLetter(): Promise<void> {
    if (!this.letter) return;
    this.busy = this.busyPdf;
    this.clearMessages();
    try {
      const path = await save({
        defaultPath: `carta-${this.structured?.company || "oferta"}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return;
      const bytes = await this.pdf.buildCoverLetter(this.letter);
      await invoke<string>("save_file", { path, bytes });
      this.showToast(this.i18n.t("offer.letterExported", { path }));
    } catch (e) {
      this.error = String(e);
    } finally {
      this.busy = "";
    }
  }
}
