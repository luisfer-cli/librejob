import { CommonModule } from "@angular/common";
import { Component, HostListener, OnInit } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ConfirmService } from "../../core/confirm.service";
import { DbService } from "../../core/db.service";
import { I18nService } from "../../core/i18n.service";
import { TranslatePipe } from "../../core/translate.pipe";
import type { JobOffer, OfferStatus } from "../../core/models";

const COLUMNS: OfferStatus[] = ["guardada", "aplicada", "entrevista", "oferta", "rechazada"];
const NEXT_STATUS: Partial<Record<OfferStatus, OfferStatus>> = {
  guardada: "aplicada",
  aplicada: "entrevista",
  entrevista: "oferta",
};

@Component({
  selector: "app-dashboard",
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.css",
})
export class DashboardComponent implements OnInit {
  columns = COLUMNS;
  offers: JobOffer[] = [];
  dragId: number | null = null;
  dragOverColumn: OfferStatus | null = null;
  contextOffer: JobOffer | null = null;
  contextX = 0;
  contextY = 0;

  constructor(
    private db: DbService,
    private confirm: ConfirmService,
    private i18n: I18nService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.offers = await this.db.listOffers();
  }

  offersBy(status: OfferStatus): JobOffer[] {
    return this.offers.filter((o) => o.status === status);
  }

  onDragStart(event: DragEvent, id: number): void {
    this.dragId = id;
    event.dataTransfer?.setData("text/plain", String(id));
  }

  onDragOver(event: DragEvent, status: OfferStatus): void {
    event.preventDefault();
    this.dragOverColumn = status;
  }

  onDragLeave(): void {
    this.dragOverColumn = null;
  }

  async onDrop(event: DragEvent, status: OfferStatus): Promise<void> {
    event.preventDefault();
    const id = this.dragId ?? Number(event.dataTransfer?.getData("text/plain"));
    this.dragId = null;
    this.dragOverColumn = null;
    if (!id) return;
    await this.db.updateOfferStatus(id, status);
    await this.load();
  }

  openContextMenu(event: MouseEvent, offer: JobOffer): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextOffer = offer;
    this.contextX = Math.min(event.clientX, Math.max(8, window.innerWidth - 228));
    this.contextY = Math.min(event.clientY, Math.max(8, window.innerHeight - 156));
  }

  closeContextMenu(): void {
    this.contextOffer = null;
  }

  nextStatus(status: OfferStatus): OfferStatus | null {
    return NEXT_STATUS[status] ?? null;
  }

  async moveToNext(): Promise<void> {
    const offer = this.contextOffer;
    const status = offer ? this.nextStatus(offer.status) : null;
    if (!offer || !status) return;
    this.closeContextMenu();
    await this.db.updateOfferStatus(offer.id, status);
    await this.load();
  }

  async moveToRejected(): Promise<void> {
    const offer = this.contextOffer;
    if (!offer || offer.status === "rechazada") return;
    this.closeContextMenu();
    await this.db.updateOfferStatus(offer.id, "rechazada");
    await this.load();
  }

  async removeOffer(): Promise<void> {
    const offer = this.contextOffer;
    if (!offer) return;
    this.closeContextMenu();
    const ok = await this.confirm.confirm({
      title: this.i18n.t("confirm.deleteOfferTitle"),
      message: this.i18n.t("confirm.deleteOffer"),
      confirmText: this.i18n.t("common.delete"),
    });
    if (!ok) return;
    await this.db.deleteOffer(offer.id);
    await this.load();
  }

  @HostListener("document:click")
  onDocumentClick(): void {
    this.closeContextMenu();
  }

  @HostListener("document:keydown.escape")
  onEscape(): void {
    this.closeContextMenu();
  }
}
