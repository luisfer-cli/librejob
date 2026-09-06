import { CommonModule } from "@angular/common";
import { Component, HostListener, type OnDestroy, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { AiService } from "../../core/ai.service";
import { SettingsService } from "../../core/settings.service";
import { I18nService, type Lang } from "../../core/i18n.service";
import { UpdaterService } from "../../core/updater.service";
import { TranslatePipe } from "../../core/translate.pipe";
import {
  AI_PROVIDERS,
  CV_STYLE_VARIANTS,
  isLocalProvider,
  type CvStyleVariant,
} from "../../core/models";

@Component({
  selector: "app-settings",
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./settings.component.html",
  styleUrl: "./settings.component.css",
})
export class SettingsComponent implements OnDestroy {
  readonly settings = inject(SettingsService);
  private readonly ai = inject(AiService);
  readonly i18n = inject(I18nService);
  readonly updater = inject(UpdaterService);
  private readonly route = inject(ActivatedRoute);

  providers = AI_PROVIDERS;
  cvStyles = CV_STYLE_VARIANTS;
  steps = [
    "settings.wizard.provider",
    "settings.wizard.credentials",
    "settings.wizard.model",
    "settings.wizard.verify",
  ];

  step = 0;
  showWizard = false;
  showCvStyleModal = false;
  selectedCvStyle: CvStyleVariant = "classic";
  provider = "openrouter";
  baseUrl = "";
  apiKey = "";
  model = "";

  models: string[] = [];
  loadingModels = false;
  modelsError = "";

  saving = false;
  testing = false;
  testResult = "";
  testError = "";
  error = "";
  toast = "";
  toastLeaving = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.settings.load().then(() => {
      const s = this.settings.settings();
      this.provider = s.provider;
      this.baseUrl = s.baseUrl;
      this.apiKey = s.apiKey;
      this.model = s.model;
      this.selectedCvStyle = s.cvStyle;
      if (this.route.snapshot.queryParamMap.get("setupAi") === "1") {
        this.openWizard();
      }
    });
  }

  get isConfigured(): boolean {
    return this.settings.isConfigured;
  }

  get updateStatusLabel(): string {
    switch (this.updater.status()) {
      case "checking":
        return this.i18n.t("updates.checking");
      case "up-to-date":
        return this.i18n.t("updates.upToDate");
      case "available":
        return this.i18n.t("updates.available", {
          version: this.updater.availableVersion(),
        });
      case "downloading":
        return this.i18n.t("updates.downloading", {
          p: this.updater.progress(),
        });
      case "installed":
        return this.i18n.t("updates.installed");
      case "error":
        return this.i18n.t("updates.error");
      default:
        return "";
    }
  }

  get currentLang(): Lang {
    return this.i18n.lang();
  }

  async setLanguage(lang: Lang): Promise<void> {
    await this.i18n.setLanguage(lang);
    this.showToast(this.i18n.t("settings.saved"));
  }

  toggleTheme(): void {
    this.settings.toggleTheme();
    this.showToast(this.i18n.t("settings.saved"));
  }

  get currentCvStyleLabel(): string {
    const style = this.cvStyles.find(
      (s) => s.key === this.settings.settings().cvStyle,
    );
    return style ? this.i18n.t(style.labelKey) : "";
  }

  get selectedCvStyleInfo() {
    return (
      this.cvStyles.find((s) => s.key === this.selectedCvStyle) ??
      this.cvStyles[0]
    );
  }

  openCvStyleModal(): void {
    this.selectedCvStyle = this.settings.settings().cvStyle;
    this.showCvStyleModal = true;
  }

  closeCvStyleModal(): void {
    this.showCvStyleModal = false;
  }

  selectCvStyle(style: CvStyleVariant): void {
    this.selectedCvStyle = style;
  }

  async saveCvStyle(): Promise<void> {
    await this.settings.setCvStyle(this.selectedCvStyle);
    this.showCvStyleModal = false;
    this.showToast(this.i18n.t("settings.saved"));
  }

  get currentProviderName(): string {
    return (
      this.providers.find((p) => p.key === this.settings.settings().provider)
        ?.name ?? ""
    );
  }

  get isLocalProvider(): boolean {
    return isLocalProvider(this.provider);
  }

  get loadedModelsLabel(): string {
    return this.i18n.t("settings.wizard.modelsLoaded", {
      n: this.models.length,
    });
  }

  openWizard(): void {
    this.step = 0;
    this.error = "";
    this.testResult = "";
    this.testError = "";
    this.showWizard = true;
  }

  closeWizard(): void {
    this.showWizard = false;
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    if (this.showWizard) this.closeWizard();
    if (this.showCvStyleModal) this.closeCvStyleModal();
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    if (this.showWizard) this.closeWizard();
    if (this.showCvStyleModal) this.closeCvStyleModal();
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

  selectProvider(key: string): void {
    this.provider = key;
    const p = this.providers.find((x) => x.key === key);
    if (p && p.baseUrl) {
      this.baseUrl = p.baseUrl;
    }
    if (isLocalProvider(key)) {
      this.apiKey = "";
    }
    this.models = [];
    this.testResult = "";
    this.testError = "";
    this.error = "";
  }

  next(): void {
    if (this.step === 1) {
      if (!this.baseUrl.trim()) {
        this.error = this.i18n.t("settings.wizard.errBaseUrl");
        return;
      }
      if (!this.isLocalProvider && !this.apiKey.trim()) {
        this.error = this.i18n.t("settings.wizard.errApiKey");
        return;
      }
    } else if (this.step === 2) {
      if (!this.model.trim()) {
        this.error = this.i18n.t("settings.wizard.errModel");
        return;
      }
    }
    this.error = "";
    this.testResult = "";
    this.testError = "";
    if (this.step < this.steps.length - 1) this.step++;
  }

  prev(): void {
    if (this.step > 0) this.step--;
    this.error = "";
  }

  async loadModels(): Promise<void> {
    if (!this.baseUrl.trim()) {
      this.modelsError = this.i18n.t("settings.wizard.errModelsUrl");
      return;
    }
    if (!this.isLocalProvider && !this.apiKey.trim()) {
      this.modelsError = this.i18n.t("settings.wizard.errModelsKey");
      return;
    }
    this.loadingModels = true;
    this.modelsError = "";
    try {
      this.models = await this.ai.listModels(
        this.baseUrl.trim(),
        this.apiKey.trim(),
      );
    } catch (e) {
      this.modelsError = String(e);
    } finally {
      this.loadingModels = false;
    }
  }

  async testConnection(): Promise<void> {
    if (!this.model.trim()) {
      this.testError = this.i18n.t("settings.wizard.errModelFirst");
      return;
    }
    this.testing = true;
    this.testResult = "";
    this.testError = "";
    try {
      this.testResult = await this.ai.testConnection(
        this.baseUrl.trim(),
        this.apiKey.trim(),
        this.model.trim(),
      );
    } catch (e) {
      this.testError = String(e);
    } finally {
      this.testing = false;
    }
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = "";
    try {
      await this.settings.setProvider(this.provider);
      await this.settings.setBaseUrl(this.baseUrl.trim());
      await this.settings.setApiKey(this.apiKey.trim());
      await this.settings.setModel(this.model.trim());
      this.showWizard = false;
      this.showToast(this.i18n.t("settings.saved"));
    } finally {
      this.saving = false;
    }
  }
}
