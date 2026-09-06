import { Component, HostListener, OnInit } from "@angular/core";
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { CommonModule } from "@angular/common";
import { SettingsService } from "./core/settings.service";
import { I18nService } from "./core/i18n.service";
import { UpdaterService } from "./core/updater.service";
import { TranslatePipe } from "./core/translate.pipe";
import { ConfirmDialogComponent } from "./components/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-root",
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    ConfirmDialogComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
  readonly welcomeSteps = [
    {
      icon: "nf-rocket",
      title: "welcome.step1.title",
      text: "welcome.step1.text",
    },
    {
      icon: "nf-account",
      title: "welcome.step2.title",
      text: "welcome.step2.text",
    },
    {
      icon: "nf-briefcase",
      title: "welcome.step3.title",
      text: "welcome.step3.text",
    },
    {
      icon: "nf-key",
      title: "welcome.step4.title",
      text: "welcome.step4.text",
    },
  ];

  showWelcomeTour = false;
  welcomeStep = 0;

  constructor(
    public settings: SettingsService,
    private i18n: I18nService,
    private updater: UpdaterService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    void this.init();
  }

  get isWelcomeLastStep(): boolean {
    return this.welcomeStep === this.welcomeSteps.length - 1;
  }

  private async init(): Promise<void> {
    await Promise.all([this.settings.load(), this.i18n.load()]);
    this.showWelcomeTour = !this.settings.welcomeTourDone();
    void this.updater.checkForUpdates();
  }

  nextWelcomeStep(): void {
    if (this.isWelcomeLastStep) return;
    this.welcomeStep++;
  }

  prevWelcomeStep(): void {
    if (this.welcomeStep > 0) this.welcomeStep--;
  }

  async skipWelcomeTour(): Promise<void> {
    await this.settings.completeWelcomeTour();
    this.showWelcomeTour = false;
  }

  async finishWelcomeTour(configureAi: boolean): Promise<void> {
    await this.settings.completeWelcomeTour();
    this.showWelcomeTour = false;
    if (configureAi) {
      await this.router.navigate(["/settings"], {
        queryParams: { setupAi: "1" },
      });
    }
  }

  @HostListener("window:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      if (event.shiftKey) {
        void this.settings.toggleSidebarHidden();
      } else {
        void this.settings.toggleSidebarCollapse();
      }
    }
  }
}
