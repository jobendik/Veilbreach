/**
 * Transient notification toasts. These are independent from the main DOM
 * render so they can appear and disappear without interfering with
 * combat animations.
 */
export class ToastSystem {
  private zone: HTMLElement;

  constructor(zone: HTMLElement) {
    this.zone = zone;
  }

  show(message: string): void {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    this.zone.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }
}
