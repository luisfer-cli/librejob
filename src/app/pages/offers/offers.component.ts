import { CommonModule } from "@angular/common";
import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AiService } from "../../core/ai.service";
import { DbService } from "../../core/db.service";
import { SettingsService } from "../../core/settings.service";
import { ConfirmService } from "../../core/confirm.service";
import { I18nService } from "../../core/i18n.service";
import { TranslatePipe } from "../../core/translate.pipe";
import type { JobOffer, JobOfferStructured } from "../../core/models";

@Component({
  selector: "app-offers",
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./offers.component.html",
  styleUrl: "./offers.component.css",
})
export class OffersComponent implements OnInit {
  @ViewChild("pasteInput") pasteInput?: ElementRef<HTMLTextAreaElement>;

  offers: JobOffer[] = [];

  showNew = false;
  loading = false;
  saving = false;
  parsed = false;
  error = "";
  generateAts = false;

  rawText = "";
  form: JobOfferStructured = this.emptyForm();

  get requirementsText(): string {
    return this.form.requirements.join("\n");
  }
  set requirementsText(v: string) {
    this.form.requirements = this.splitLines(v);
  }

  get responsibilitiesText(): string {
    return this.form.responsibilities.join("\n");
  }
  set responsibilitiesText(v: string) {
    this.form.responsibilities = this.splitLines(v);
  }

  private splitLines(v: string): string[] {
    return v
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  constructor(
    private db: DbService,
    private ai: AiService,
    private settings: SettingsService,
    private router: Router,
    private confirm: ConfirmService,
    private i18n: I18nService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  openOffer(id: number): void {
    this.router.navigate(["/offers", id]);
  }

  private emptyForm(): JobOfferStructured {
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

  async load(): Promise<void> {
    this.offers = await this.db.listOffers();
  }

  openNew(): void {
    this.showNew = true;
    this.rawText = "";
    this.form = this.emptyForm();
    this.parsed = false;
    this.generateAts = false;
    this.error = "";
    setTimeout(() => this.pasteInput?.nativeElement.focus(), 0);
  }

  cancel(): void {
    this.showNew = false;
  }

  async process(): Promise<void> {
    if (!this.settings.isConfigured) {
      this.error = this.i18n.t("error.configureAi");
      return;
    }
    if (!this.rawText.trim()) {
      this.error = this.i18n.t("error.pasteFirst");
      return;
    }
    this.loading = true;
    this.error = "";
    try {
      this.form = await this.ai.parseJobOffer(this.rawText);
      this.parsed = true;
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  async save(): Promise<void> {
    if (!this.form.title.trim() && !this.form.company.trim()) {
      this.error = this.i18n.t("error.titleOrCompany");
      return;
    }
    this.saving = true;
    try {
      const id = await this.db.createOffer({
        title: this.form.title,
        company: this.form.company,
        location: this.form.location,
        rawText: this.rawText,
        structured: JSON.stringify(this.form),
        status: "guardada",
        salary: this.form.salary,
        url: this.form.applicationUrl,
      });
      if (this.generateAts) {
        try {
          const cvData = await this.db.getCvData();
          const analysis = await this.ai.analyzeAts(cvData, this.form);
          await this.db.saveAtsAnalysis(id, analysis);
        } catch (e) {
          console.error("No se pudo generar el análisis ATS:", e);
        }
      }
      this.showNew = false;
      await this.load();
    } finally {
      this.saving = false;
    }
  }

  async remove(id: number): Promise<void> {
    const ok = await this.confirm.confirm({
      title: this.i18n.t("confirm.deleteOfferTitle"),
      message: this.i18n.t("confirm.deleteOffer"),
      confirmText: this.i18n.t("common.delete"),
    });
    if (!ok) return;
    await this.db.deleteOffer(id);
    await this.load();
  }
}
