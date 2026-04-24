import type { GameState, ShopCardItem, ShopPotionItem, ShopRelicItem } from "../../core/Types";
import { CARD_DB } from "../../data/cards";
import { RELIC_DB } from "../../data/relics";
import { POTION_DB } from "../../data/potions";
import { renderCardPreview } from "../components/CardView";
import { findKeywordsIn } from "../../data/keywords";

/**
 * Renders the shop screen. Each item shows its price and a buy button
 * disabled when the player cannot afford it or the item is sold out.
 */
export function renderShopScreen(state: GameState): string {
  const run = state.run!;
  const shop = state.shop!;

  const cardsHtml = shop.cards.map((c) => renderCardItem(c, run.gold)).join("");
  const relicsHtml = shop.relics.map((r) => renderRelicItem(r, run.gold)).join("");
  const potionsHtml = shop.potions.map((p) => renderPotionItem(p, run.gold)).join("");

  const canRemove = !shop.removeUsed && run.gold >= shop.removeServicePrice;

  return `
    <main class="screen shop-screen">
      <section class="shop-box">
        <header class="shop-header">
          <div class="eyebrow">Merchant</div>
          <h2>Shop</h2>
          <div class="shop-gold">
            <span class="pill gold"><strong>${run.gold}</strong> Gold</span>
          </div>
        </header>

        <h3 class="section-title">Cards</h3>
        <div class="shop-row shop-cards">${cardsHtml}</div>

        <h3 class="section-title">Relics</h3>
        <div class="shop-row shop-relics">${relicsHtml || '<div class="empty-note">Sold out.</div>'}</div>

        <h3 class="section-title">Potions</h3>
        <div class="shop-row shop-potions">${potionsHtml || '<div class="empty-note">Sold out.</div>'}</div>

        <h3 class="section-title">Services</h3>
        <div class="shop-actions">
          <button data-action="shop-remove"
                  ${canRemove ? "" : "disabled"}
                  type="button">
            Remove a Card (${shop.removeServicePrice} Gold)${shop.removeUsed ? " — used" : ""}
          </button>
          <button class="primary" data-action="shop-leave" type="button">Leave Shop</button>
        </div>
      </section>
    </main>
  `;
}

function renderCardItem(item: ShopCardItem, gold: number): string {
  const card = CARD_DB[item.cardId];
  if (!card) return "";
  const affordable = gold >= item.price && !item.sold;
  return `
    <div class="shop-item shop-item-card ${item.sold ? "sold" : ""}">
      ${renderCardPreview(item.cardId, item.cardId)}
      <div class="shop-price">${item.price} Gold</div>
      <button data-action="shop-buy-card"
              data-id="${item.cardId}"
              ${affordable ? "" : "disabled"}
              type="button">
        ${item.sold ? "Sold" : "Buy"}
      </button>
    </div>
  `;
}

function renderRelicItem(item: ShopRelicItem, gold: number): string {
  const r = RELIC_DB[item.relicId];
  if (!r) return "";
  const affordable = gold >= item.price && !item.sold;
  const rarity = r.rarity ?? "Common";
  const keywords = findKeywordsIn(r.description);
  const tipHeader = `${r.name} — ${rarity}\n${r.description}`;
  const tip = keywords.length
    ? `${tipHeader}\n\n${keywords.map((k) => `${k.label}: ${k.tip}`).join("\n")}`
    : tipHeader;
  return `
    <div class="shop-item shop-item-relic ${item.sold ? "sold" : ""}"
         data-rarity="${rarity}"
         data-tip="${escapeHtml(tip)}">
      <div class="relic-big"><span class="relic-icon">${r.icon}</span></div>
      <strong>${escapeHtml(r.name)}</strong>
      <span class="rarity-pill rarity-${rarity.toLowerCase()}">${rarity}</span>
      <small>${escapeHtml(r.description)}</small>
      <div class="shop-price">${item.price} Gold</div>
      <button data-action="shop-buy-relic"
              data-id="${item.relicId}"
              ${affordable ? "" : "disabled"}
              type="button">
        ${item.sold ? "Sold" : "Buy"}
      </button>
    </div>
  `;
}

function renderPotionItem(item: ShopPotionItem, gold: number): string {
  const p = POTION_DB[item.potionId];
  if (!p) return "";
  const affordable = gold >= item.price && !item.sold;
  return `
    <div class="shop-item shop-item-potion ${item.sold ? "sold" : ""}">
      <div class="potion-big" style="background:linear-gradient(180deg, ${p.color[0]}, ${p.color[1]});">
        <span class="potion-icon">${p.icon}</span>
      </div>
      <strong>${escapeHtml(p.name)}</strong>
      <small>${escapeHtml(p.description)}</small>
      <div class="shop-price">${item.price} Gold</div>
      <button data-action="shop-buy-potion"
              data-id="${item.potionId}"
              ${affordable ? "" : "disabled"}
              type="button">
        ${item.sold ? "Sold" : "Buy"}
      </button>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
