import type { CardId, CardInstance, ResolvedCardData } from "../../core/Types";
import { CARD_DB, getCardData } from "../../data/cards";
import { TYPE_SIGIL } from "../../data/config";
import { findKeywordsIn } from "../../data/keywords";

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
  const tip = buildCardTip(data);

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

/**
 * Render a preview of a card by its ID without instantiating a live
 * CardInstance. Use this for reward screens, shops, and any other
 * preview surface so idempotent renders don't inflate the global UID
 * counter.
 */
export function renderCardPreview(cardId: CardId, rewardId?: CardId): string {
  const data = CARD_DB[cardId];
  if (!data) return "";
  const [c1, c2] = data.fallbackColor ?? ["#303853", "#7777ff"];
  const tip = buildCardTip(data);
  const art = data.imagePath
    ? `<img src="${escapeHtml(data.imagePath)}" alt="" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;sigil&quot;>${TYPE_SIGIL[data.type] || "✦"}</div>'">`
    : `<div class="sigil">${TYPE_SIGIL[data.type] || "✦"}</div>`;
  return `
    <div class="card"
         data-reward-card="${rewardId ?? cardId}"
         data-tip="${escapeHtml(tip)}"
         role="button"
         tabindex="0"
         aria-label="${escapeHtml(data.name)}: ${escapeHtml(data.description)}">
      <div class="card-bg" style="--c1:${c1}; --c2:${c2};"></div>
      <div class="card-top">
        <div class="cost">${data.cost}</div>
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

/**
 * Build the hover tooltip text for a card. Appends short glossary entries
 * for any keywords (Exhaust, Scry, Breach, Burn, …) referenced in the
 * card's description so the player never has to guess what a term means.
 */
function buildCardTip(data: ResolvedCardData): string {
  const header = `${data.type} • ${data.rarity} • ${describeTarget(data.targetType)}. ${data.description}`;
  const scan = `${data.description} ${data.exhaustSelf ? "Exhaust" : ""} ${data.retain ? "Retain" : ""} ${data.innate ? "Innate" : ""}`;
  const keywords = findKeywordsIn(scan);
  if (keywords.length === 0) return header;
  const glossary = keywords.map((k) => `${k.label}: ${k.tip}`).join("\n");
  return `${header}\n\n${glossary}`;
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
