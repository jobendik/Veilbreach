import type { GameState } from "../../core/Types";
import { RELIC_DB } from "../../data/relics";
import { POTION_DB } from "../../data/potions";
import { renderCardPreview } from "../components/CardView";
import { findKeywordsIn } from "../../data/keywords";

/**
 * Post-combat reward screen. Shows gold, optional potion drop, card
 * choices (skipped on boss), and a relic offering (elite / boss only).
 * The legacy auto-camp services (heal / upgrade / remove) were moved to
 * Rest sites and Shops — they no longer appear here.
 */
export function renderRewardScreen(state: GameState): string {
  const reward = state.reward!;
  const run = state.run!;

  const goldSection = !reward.goldClaimed
    ? `
      <div class="reward-line">
        <span><strong>${reward.goldReward}</strong> Gold</span>
        <button class="primary"
                data-action="reward-claim-gold"
                type="button">Claim</button>
      </div>
    `
    : `<div class="reward-line claimed">Gold claimed.</div>`;

  const potionSection = reward.potionDrop && !reward.potionClaimed
    ? (() => {
        const potion = POTION_DB[reward.potionDrop!];
        if (!potion) return "";
        return `
          <div class="reward-line">
            <span>
              <span class="potion-chip" style="background:linear-gradient(180deg, ${potion.color[0]}, ${potion.color[1]});">${potion.icon}</span>
              <strong>${escapeHtml(potion.name)}</strong> — ${escapeHtml(potion.description)}
            </span>
            <button data-action="reward-claim-potion" type="button">Take</button>
          </div>
        `;
      })()
    : reward.potionClaimed && reward.potionDrop
      ? `<div class="reward-line claimed">Potion claimed.</div>`
      : "";

  const cardSection = !reward.pickedCard && reward.cardChoices.length
    ? `
      <h3 class="section-title">Add one card to your deck</h3>
      <div class="reward-cards">
        ${reward.cardChoices.map((id) => renderCardPreview(id, id)).join("")}
      </div>
      <div class="reward-actions">
        <button class="ghost" data-action="skip-card" type="button">Skip Card Reward</button>
      </div>
    `
    : reward.pickedCard && reward.cardChoices.length
      ? `<div class="notice notice-centered">Card reward resolved.</div>`
      : "";

  const relicSection =
    reward.relicOffer && reward.relicOffer.length && !reward.pickedRelic
      ? `
        <h3 class="section-title">Choose one relic</h3>
        <div class="reward-actions">
          ${reward.relicOffer
            .map((id) => {
              const r = RELIC_DB[id];
              if (!r) return "";
              const rarity = r.rarity ?? "Common";
              const keywords = findKeywordsIn(r.description);
              const tipHeader = `${r.name} — ${rarity}\n${r.description}`;
              const tip = keywords.length
                ? `${tipHeader}\n\n${keywords.map((k) => `${k.label}: ${k.tip}`).join("\n")}`
                : tipHeader;
              return `
                <button class="relic-choice"
                        data-action="choose-relic"
                        data-relic="${id}"
                        data-rarity="${rarity}"
                        data-tip="${escapeHtml(tip)}"
                        type="button">
                  <span class="relic-choice-icon">${r.icon}</span>
                  <strong>${escapeHtml(r.name)}</strong>
                  <span class="rarity-pill rarity-${rarity.toLowerCase()}">${rarity}</span>
                  <small>${escapeHtml(r.description)}</small>
                </button>
              `;
            })
            .join("")}
        </div>
      `
      : "";

  const eyebrow = reward.wasBoss
    ? "Boss Defeated"
    : reward.wasElite
      ? "Elite Defeated"
      : "Encounter Cleared";

  return `
    <main class="screen reward-screen">
      <section class="reward-box">
        <div class="eyebrow">${eyebrow}</div>
        <h2>Your Rewards</h2>
        <p class="subtitle left-aligned">
          HP ${run.hp}/${run.maxHp}. Your deck has ${run.deck.length} cards.
        </p>
        ${goldSection}
        ${potionSection}
        ${cardSection}
        ${relicSection}
        <div class="reward-actions">
          <button class="primary" data-action="continue-reward" type="button">Continue</button>
        </div>
      </section>
    </main>
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
