import type { CardId, CardInstance, ResolvedCardData } from "../../core/Types";
import { getCardData } from "../../data/cards";
import { TYPE_SIGIL } from "../../data/config";

export interface CardRenderOptions {
  zone: "hand" | "reward" | "modal";
  rewardId?: CardId;
  playable?: boolean;
  selected?: boolean;
}

/**
 * Renders a single card as an HTML string. Data-attributes on the root
 * element drive event delegation — the InputController reads
 * `data-card` and `data-reward-card` to route clicks.
 */
export function renderCardElement(
  card: CardInstance,
  options: CardRenderOptions
): string {
  const data: ResolvedCardData = getCardData(card);
  const cost = card.tempCost !== null ? card.tempCost : data.cost;
  const [c1, c2] = data.fallbackColor ?? ["#303853", "#7777ff"];
  const upgradedClass = card.upgraded ? "upgraded" : "";
  const unplayableClass =
    options.zone === "hand" && options.playable === false ? "unplayable" : "";
  const selectedClass = options.selected ? "selected" : "";
  const tip = `${data.type} • ${data.rarity} • ${describeTarget(data.targetType)}. ${data.description}`;

  const art = data.imagePath
    ? `<img src="${escapeHtml(data.imagePath)}" alt="" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;sigil&quot;>${TYPE_SIGIL[data.type] || "✦"}</div>'">`
    : `<div class="sigil">${TYPE_SIGIL[data.type] || "✦"}</div>`;

  return `
    <div class="card ${upgradedClass} ${unplayableClass} ${selectedClass}"
         data-card="${card.uid}"
         data-reward-card="${options.rewardId ?? ""}"
         data-tip="${escapeHtml(tip)}"
         role="button"
         tabindex="0"
         aria-label="${escapeHtml(data.name)}: ${escapeHtml(data.description)}">
      <div class="card-bg" style="--c1:${c1}; --c2:${c2};"></div>
      <div class="card-top">
        <div class="cost">${cost}</div>
        <div class="card-title">${escapeHtml(data.name)}</div>
      </div>
      <div class="card-art">${art}</div>
      <div class="card-type">
        <span>${data.type}</span>
        <span class="rarity">${data.rarity}</span>
      </div>
      <div class="card-desc">${escapeHtml(data.description)}</div>
    </div>
  `;
}

export function renderMiniCard(card: CardInstance): string {
  const data = getCardData(card);
  return `
    <div class="mini-card" data-mini-card="${card.uid}">
      <b>${escapeHtml(data.name)}${card.upgraded ? "+" : ""}</b>
      <span>${data.cost} cost • ${data.type} • ${data.rarity}</span>
    </div>
  `;
}

function describeTarget(t: string): string {
  switch (t) {
    case "enemy":
      return "Targeted";
    case "allEnemies":
      return "All enemies";
    case "self":
      return "Self";
    case "randomEnemy":
      return "Random enemy";
    default:
      return t;
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
