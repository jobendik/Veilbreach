import type { CardInstance } from "../core/Types";
import { renderCardElement } from "./components/CardView";

export type DeckModalMode =
  | "view"
  | "upgrade-reward"
  | "remove-reward"
  | "upgrade-event"
  | "remove-event"
  | "upgrade-rest"
  | "remove-shop";

export interface DeckModalCallbacks {
  onCardSelected(uid: string, mode: DeckModalMode): void;
}

export class ModalSystem {
  private root: HTMLElement;
  private current: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  openDeckModal(
    title: string,
    mode: DeckModalMode,
    deck: CardInstance[],
    callbacks: DeckModalCallbacks
  ): void {
    this.close();
    const modal = document.createElement("div");
    modal.className = "deck-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="deck-modal-inner">
        <div class="deck-modal-header">
          <div>
            <div class="eyebrow">${mode === "view" ? "Deck List" : "Deck Action"}</div>
            <h2>${escapeHtml(title)}</h2>
          </div>
          <button class="ghost" data-modal-close type="button">Close</button>
        </div>
        <div class="modal-grid">
          ${deck.map((card) => renderCardElement(card, { zone: "modal" })).join("")}
        </div>
      </div>
    `;
    this.root.appendChild(modal);
    this.current = modal;

    modal.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target === modal) {
        this.close();
        return;
      }
      if (target.closest("[data-modal-close]")) {
        this.close();
        return;
      }
      const cardEl = target.closest("[data-card]") as HTMLElement | null;
      if (cardEl) {
        const uid = cardEl.dataset.card;
        if (!uid) return;
        if (mode === "view") return;
        callbacks.onCardSelected(uid, mode);
      }
    });
  }

  close(): void {
    if (this.current) {
      this.current.remove();
      this.current = null;
    }
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
