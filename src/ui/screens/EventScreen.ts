import type { GameState, EventChoice } from "../../core/Types";
import { findKeywordsIn } from "../../data/keywords";

/**
 * Event screen. Renders choice buttons driven by the EventState data
 * produced by EventSystem. Disabled choices still render but cannot be
 * clicked, and show their `disabledReason` beside the effect text.
 *
 * When the event is resolved (a choice was picked), the screen swaps to
 * the outcome text plus a Leave button that returns to the map.
 */
export function renderEventScreen(state: GameState): string {
  const ev = state.event!;
  const run = state.run!;

  const body = ev.resolved
    ? `
      <p class="subtitle left-aligned outcome-text">${escapeHtml(ev.outcomeText)}</p>
      <div class="event-actions">
        <button class="primary" data-action="event-leave" type="button">Leave</button>
      </div>
    `
    : `
      <div class="event-actions event-choices">
        ${ev.choices.map(renderChoice).join("")}
      </div>
    `;

  return `
    <main class="screen event-screen">
      <section class="event-box">
        <div class="eyebrow">Event — ${run.hp}/${run.maxHp} HP, ${run.gold} Gold</div>
        <h2>${escapeHtml(ev.title)}</h2>
        <p class="subtitle left-aligned">${escapeHtml(ev.text)}</p>
        ${body}
      </section>
    </main>
  `;
}

function renderChoice(choice: EventChoice): string {
  const disabled = choice.disabled ? "disabled" : "";
  const hint = choice.disabled && choice.disabledReason
    ? `<em class="disabled-reason"> — ${escapeHtml(choice.disabledReason)}</em>`
    : "";
  const keywords = findKeywordsIn(`${choice.label} ${choice.effectText}`);
  const tip = keywords.length
    ? keywords.map((k) => `${k.label}: ${k.tip}`).join("\n")
    : "";
  const tipAttr = tip ? ` data-tip="${escapeHtml(tip)}"` : "";
  return `
    <button class="event-choice ${choice.disabled ? "is-disabled" : ""}"
            data-action="event-choice"
            data-choice="${choice.id}"
            ${disabled}${tipAttr}
            type="button">
      <strong>${escapeHtml(choice.label)}</strong>
      <small>${escapeHtml(choice.effectText)}${hint}</small>
    </button>
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
