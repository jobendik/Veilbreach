import type { Unit } from "../core/Types";

/**
 * Floating numeric/text popups that fade up from a point on screen.
 * Used for +/- damage, block gains, status application, etc.
 *
 * These live in the global toastZone so the main render cycle can replace
 * the combat DOM without interrupting their animations.
 */
export class FloatingTextSystem {
  private zone: HTMLElement;

  constructor(zone: HTMLElement) {
    this.zone = zone;
  }

  atCenter(message: string, color = "#eef4ff"): void {
    const el = this.build(message, color);
    el.style.left = "50vw";
    el.style.top = "45vh";
    this.zone.appendChild(el);
    setTimeout(() => el.remove(), 920);
  }

  nearUnit(unit: Unit | null, message: string, color = "#eef4ff"): void {
    const rect = this.findUnitRect(unit);
    if (!rect) {
      this.atCenter(message, color);
      return;
    }
    const el = this.build(message, color);
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + rect.height * 0.28}px`;
    this.zone.appendChild(el);
    setTimeout(() => el.remove(), 920);
  }

  private findUnitRect(unit: Unit | null): DOMRect | null {
    if (!unit) return null;
    if (unit.uid) {
      const el = document.querySelector(`[data-unit="${unit.uid}"]`);
      if (el) return el.getBoundingClientRect();
    } else {
      const el =
        document.querySelector(`[data-unit="player"]`) ||
        document.querySelector(".player-panel");
      if (el) return el.getBoundingClientRect();
    }
    return null;
  }

  private build(message: string, color: string): HTMLElement {
    const el = document.createElement("div");
    el.className = "float-text";
    el.textContent = message;
    el.style.color = color;
    return el;
  }
}
