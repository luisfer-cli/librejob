import { Injectable, signal } from "@angular/core";
import { DbService } from "./db.service";
import {
  baseUrlForProvider,
  isCvStyleVariant,
  isLocalProvider,
  type AppSettings,
  type CvStyleVariant,
  type SidebarMode,
} from "./models";

const SIDEBAR_MODES: SidebarMode[] = ["expanded", "collapsed", "hidden"];

@Injectable({ providedIn: "root" })
export class SettingsService {
  readonly settings = signal<AppSettings>({
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "",
    model: "",
    theme: "light",
    cvStyle: "classic",
  });

  readonly sidebarMode = signal<SidebarMode>("expanded");
  readonly welcomeTourDone = signal(false);
  private lastVisible: SidebarMode = "expanded";
  private loaded = false;

  constructor(private db: DbService) {}

  async load(): Promise<void> {
    if (this.loaded) return;
    const raw = await this.db.getSettings();
    const provider = raw["provider"] ?? "openrouter";
    const baseUrl = raw["base_url"] ?? baseUrlForProvider(provider);
    const apiKey = raw["api_key"] ?? raw["openrouter_api_key"] ?? "";
    const model = raw["model"] ?? "";
    const theme = raw["theme"] === "dark" ? "dark" : "light";
    const rawCvStyle = raw["cv_style"] ?? "classic";
    const cvStyle = isCvStyleVariant(rawCvStyle) ? rawCvStyle : "classic";
    this.welcomeTourDone.set(raw["welcome_tour_done"] === "1");

    const sm = raw["sidebar_mode"] as SidebarMode | undefined;
    if (sm && SIDEBAR_MODES.includes(sm)) {
      this.sidebarMode.set(sm);
      if (sm !== "hidden") this.lastVisible = sm;
    }

    this.settings.set({ provider, baseUrl, apiKey, model, theme, cvStyle });
    this.applyTheme(theme);
    this.loaded = true;
  }

  get isConfigured(): boolean {
    const s = this.settings();
    const needsKey = !isLocalProvider(s.provider);
    return !!(
      (!needsKey || s.apiKey.trim()) &&
      s.baseUrl.trim() &&
      s.model.trim()
    );
  }

  async setProvider(provider: string): Promise<void> {
    const baseUrl = baseUrlForProvider(provider);
    await this.db.setSetting("provider", provider);
    if (baseUrl) await this.db.setSetting("base_url", baseUrl);
    this.settings.update((s) => ({
      ...s,
      provider,
      baseUrl: baseUrl || s.baseUrl,
    }));
  }

  async setBaseUrl(value: string): Promise<void> {
    await this.db.setSetting("base_url", value);
    this.settings.update((s) => ({ ...s, baseUrl: value }));
  }

  async setApiKey(value: string): Promise<void> {
    await this.db.setSetting("api_key", value);
    this.settings.update((s) => ({ ...s, apiKey: value }));
  }

  async setModel(value: string): Promise<void> {
    await this.db.setSetting("model", value);
    this.settings.update((s) => ({ ...s, model: value }));
  }

  async setTheme(value: "light" | "dark"): Promise<void> {
    this.settings.update((s) => ({ ...s, theme: value }));
    this.applyTheme(value);
    try {
      await this.db.setSetting("theme", value);
    } catch {
      // Best-effort.
    }
  }

  async setCvStyle(value: CvStyleVariant): Promise<void> {
    this.settings.update((s) => ({ ...s, cvStyle: value }));
    try {
      await this.db.setSetting("cv_style", value);
    } catch {
      // Persistencia best-effort: el estilo se aplicó en memoria.
    }
  }

  async setSidebarMode(mode: SidebarMode): Promise<void> {
    if (mode === "hidden" && this.sidebarMode() !== "hidden") {
      this.lastVisible = this.sidebarMode();
    }
    if (mode !== "hidden") this.lastVisible = mode;
    this.sidebarMode.set(mode);
    try {
      await this.db.setSetting("sidebar_mode", mode);
    } catch {
      // Persistencia best-effort: el estado de UI ya se aplicó.
    }
  }

  async toggleSidebarCollapse(): Promise<void> {
    const cur = this.sidebarMode();
    if (cur === "hidden") {
      await this.setSidebarMode(this.lastVisible);
    } else if (cur === "collapsed") {
      await this.setSidebarMode("expanded");
    } else {
      await this.setSidebarMode("collapsed");
    }
  }

  async toggleSidebarHidden(): Promise<void> {
    const cur = this.sidebarMode();
    if (cur === "hidden") {
      await this.setSidebarMode(this.lastVisible);
    } else {
      await this.setSidebarMode("hidden");
    }
  }

  async completeWelcomeTour(): Promise<void> {
    this.welcomeTourDone.set(true);
    try {
      await this.db.setSetting("welcome_tour_done", "1");
    } catch {
      // Persistencia best-effort: no bloquea el uso de la app.
    }
  }

  toggleTheme(): void {
    const next = this.settings().theme === "dark" ? "light" : "dark";
    void this.setTheme(next);
  }

  private applyTheme(theme: "light" | "dark"): void {
    document.documentElement.setAttribute("data-theme", theme);
  }
}
