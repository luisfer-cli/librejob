import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AiActivityService {
  private readonly running = signal(0);
  readonly active = () => this.running() > 0;

  async track<T>(work: Promise<T>): Promise<T> {
    this.running.update((n) => n + 1);
    try {
      return await work;
    } finally {
      this.running.update((n) => Math.max(0, n - 1));
    }
  }
}
