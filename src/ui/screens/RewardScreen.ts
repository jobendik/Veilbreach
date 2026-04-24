import type { GameState } from "../../core/Types";
import { createCardInstance } from "../../data/cards";
import { RELIC_DB } from "../../data/relics";
import { renderCardElement } from "../components/CardView";

export function renderRewardScreen(state: GameState): string {
  const reward = state.reward!;
  const run = state.run!;

  const cardSection = !reward.pickedCard
    ? `
      <h3 class="section-title">Add one card to your deck</h3>
      <div class="reward-cards">
        ${reward.cardChoices
          .map((id) =>
            renderCardElement(createCardInstance(id), { zone: "reward", rewardId: id })
          )
          .join("")}
      </div>
      <div class="reward-actions">
        <button class="ghost" data-action="skip-card" type="button">Skip Card Reward</button>
      </div>
    `
    : `<div class="notice notice-centered">Card reward resolved.</div>`;

  const relicSection =
    reward.relicOffer && reward.relicOffer.length && !reward.pickedRelic
      ? `
        <h3 class="section-title">Choose one relic</h3>
        <div class="reward-actions">
          ${reward.relicOffer
            .map((id) => {
              const r = RELIC_DB[id];
              if (!r) return "";
              return `
                <button data-action="choose-relic" data-relic="${id}" type="button">
                  <span style="font-size:22px;">${r.icon}</span>
                  <strong>${escapeHtml(r.name)}</strong><br>
                  <small>${escapeHtml(r.description)}</small>
                </button>
              `;
            })
            .join("")}
        </div>
      `
      : "";

  return `
    <main class="screen reward-screen">
      <section class="reward-box">
        <div class="eyebrow">Encounter Cleared</div>
        <h2>Choose Your Reward</h2>
        <p class="subtitle left-aligned">
          HP ${run.hp}/${run.maxHp}. Your deck has ${run.deck.length} cards.
          Choose carefully; every card changes the run.
        </p>
        ${cardSection}
        ${relicSection}
        <h3 class="section-title">Optional camp services</h3>
        <div class="reward-actions">
          <button data-action="reward-heal" ${reward.canHeal ? "" : "disabled"} type="button">Heal 10 HP</button>
          <button data-action="reward-upgrade" ${reward.canUpgrade ? "" : "disabled"} type="button">Upgrade a Card</button>
          <button data-action="reward-remove" ${reward.canRemove ? "" : "disabled"} type="button">Remove a Card</button>
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
