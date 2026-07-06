# Watchlist screen

Source of truth for building the Watchlist in the app. Reference mock: astir-watchlist-v14.html. Everything here uses tokens from AGENTS.md section 3; no raw values in components. Where this spec names a component that shadcn provides (dropdown, popover, calendar, dialog, tooltip), use the shadcn component themed with our tokens. Do not hand-roll them from the mock's JS; the mock defines the look and behavior, not the implementation.

Current implementation amendments:
- The static prototype uses shared native HTML/CSS/JS controls that follow the same design-system behavior. In a shadcn app, use the shadcn primitives named below.
- Modals do not have X close buttons. Close happens through Cancel, Esc, or backdrop click.
- If a dropdown, menu, or calendar is open inside a modal, outside click closes that layer first and does not close the modal.
- Multi-location rows show a small inline `+N` marker with no location hover state.
- Type follows AGENTS.md: three font sizes total, using color, weight, and spacing for hierarchy.
- Icon-only controls use real SVG/icon components only. Do not use text glyphs for UI icons, including checks, chevrons, kebabs, plus signs, arrows, or calendar icons.
- Icon-only controls sit in stable icon boxes so their visual size and alignment are consistent. Watchlist action icons default to muted gray. Bell is gold only when alerts are on. Flame is gold because it marks a new posting. Plus and kebab are gray by default and may turn gold only on hover or active states.

---

## 1. Purpose and shape

The Watchlist surfaces only what is alive: companies that currently have matching open roles, with those roles listed under them. Companies without matches collapse into a quiet section at the bottom. Management (alerts, edit, remove) is available on every company row without leaving the screen.

Page structure top to bottom:
1. Header row: h1 "Watchlist" left, ghost button "Add company" right.
2. Company cards, one per company with at least one open matching role. Order: company with the freshest match first.
3. Quiet section: collapsed disclosure line, expands to compact rows for companies with no current matches.

## 2. Company card

Card recipe (card bg, line border, r-lg 14, card shadow), 8px vertical padding, 16px gap between cards.

**Company head** (equal top and bottom padding, flex, centered):
1. Company name: 14.5px, weight 600, ink. Name only; no location or metadata in the head.
2. Bell toggle, immediately after the name (26px round icon button, 14px bell icon):
   - Alerts on: gold-deep icon. Hover: gold-soft circle.
   - Alerts off: muted icon with a diagonal slash. Hover: neutral hover circle.
   - Toggling shows a snackbar (strings in section 8). Alerts affect email only; visibility of roles on this screen is never affected by the bell.
3. Spacer.
4. Kebab (30px icon button) with menu (menu recipe): items "Edit" and "Remove". Kebab icon is a real filled three-dot SVG, not a text glyph. It is muted by default and the same visual weight as the row plus icon.

**Role rows** inside the card, separated by 1px line borders, equal top and bottom padding, top-aligned flex:

Left to right:
1. **Flame slot**, 22px fixed. Shows a fine outline flame icon when the posting is new, defined as `first_seen` within the last 48 hours. Use a real SVG, around 13px, gold-deep stroke around 1.55, with rounded caps and joins. It should read light and narrow, not chunky or filled. After 48 hours the flame disappears; no animation, the row simply renders without it. Rows without a flame keep the empty 22px slot so titles align. The flame is not interactive; it has a tooltip "New" but no hover background and default cursor.
2. **Role block** (two lines):
   - Title line: role title, 14px ink, single line. Truncates with ellipsis only when the container forces it; no fixed max width. Full title available on hover (title attribute or tooltip). Immediately after the title text: a 22px round icon button with a real up-right arrow SVG, tooltip "Open posting", which opens the posting URL in a new tab. Hover: gold-soft circle, gold-deep icon. Because the title truncates before the button, the button never overflows.
   - Location line: 12px muted. Format is always `City, Mode` with mode capitalized: "Berlin, Hybrid", "Berlin, On-site", "Stockholm, Remote". This capitalization is a deliberate exception to the sentence-case copy rule; location modes are treated as labels. Multi-location postings render as "Berlin +6, Remote". The `+6` inherits the exact location text style: same color, weight, and size. No underline and no hover state.
3. **Log application button**, right-aligned: 30px round icon button with a real plus SVG, tooltip "Log application". Opens the log-application modal prefilled (section 4). The plus is muted gray by default, visually consistent with the kebab size/weight, and turns gold only on hover with a gold-soft circle.

Company cards never show counts of any kind.

## 3. Quiet section

Sits 32px below the last card.

Collapsed state: a borderless disclosure line, 13px muted, chevron left: "Nothing open elsewhere right now". Chevron rotates 90 degrees when open (.25s ease). Hover: text darkens to ink2.

Expanded: compact rows (card bg, line border, r-md 12, padding 8px 12px 8px 18px, 8px gaps). Each row: company name (14px, 600), bell toggle, spacer, kebab with the same Edit and Remove items. No status text, no "watching" label, nothing else.

When a company gains a match it moves up into the cards; when its last match closes or is applied to, it moves down here. No animation requirements beyond a fade.

Empty states:
- No companies at all (first run): the quiet section does not render. Show an invitation under the header instead: "Add a company you would fight for. We will watch its board for you." with the Add company button as the natural next step.
- Companies exist but all are quiet: cards area empty, quiet line reads as usual and is expanded by default in this one case.

## 4. Applied flow (the core interaction)

Tapping the plus on a role row opens the **log-application modal** prefilled. This is the same log-application modal used elsewhere in the app, not a separate component.

Modal (r-xl 18, 32px padding, standard backdrop, Esc and backdrop close):
1. Title: "Log application" (display font 19/600).
2. Hint line directly under the title, 14px muted: "Saving adds this to your applications and clears it from the watchlist." This line appears only when the modal was opened from a Watchlist role row.
3. Fields in order:
   - **Link** (text, prefilled with the posting URL)
   - **Company** (text, prefilled from the company record)
   - **Role** (text, prefilled from the posting title)
   - One row, two half-width fields:
     - **Status**: custom select, default "Applied". Options come from the user's stage list; defaults are Applied, 1st stage, 2nd stage, 3rd stage, Offer, Rejected, Hired. (Select and Saved are not offered in this flow.)
     - **Applied date**: date picker trigger, defaults to today. When the value is today the trigger reads "Today"; otherwise "2 July 2026" format (d MMMM yyyy).
   - **Note**: optional textarea, 3 rows, no resize handle. Placeholder: "Anything you want to remember about this one".
4. Actions right-aligned: ghost "Cancel", solid gold "Log application".

On save:
1. Create the application record (separate object from the posting, per the data model).
2. Remove the role row with a ~.3s fade. If it was the company's last open role, fade the whole card and move the company to the quiet section.
3. Snackbar: "Application logged."
4. The rail mini-orb gives the same quiet pulse as any application save.

If the chosen status is 1st stage or later, the application appears in the Pipeline immediately; stage drives visibility everywhere, no special casing.

### Status select behavior
The open menu overlays the field so the currently selected option renders exactly where the closed field sits (macOS-select style). This means the menu shifts vertically based on the selected option index: if "3rd stage" is selected, that row sits over the trigger and the earlier options appear above it. Menu uses the menu recipe; selected item is ink at 500 weight with a small gold-deep SVG check on the right. The check is a real SVG in a stable icon box, never a text glyph. Hover rows use the standard soft hover. Menu width: at least the field, expanding to fit the longest option on one line. The closed trigger uses a real SVG down-chevron in a stable icon box, never a text glyph. Implement with the shadcn Select, themed; the overlay alignment is the one custom behavior to add.

### Date picker behavior
Popover (menu recipe surface, 12px padding, fixed width around 252px) anchored to the field. Header: month and year on one line ("July 2026", 13/500, nowrap), 26px round prev and next chevron buttons. Monday-first weekday row (M T W T F S S, 11px muted). Day grid: 30px circular cells, 12px text, 2px gaps; the full month fits without scrolling. States: today = 1.5px inset gold ring; selected = solid gold with on-gold text (the only solid gold in the picker); adjacent-month days = line2-colored text; hover = neutral soft circle. The closed date trigger uses a real calendar SVG in a stable icon box, never a text glyph. Use the shadcn Calendar in a Popover, themed to this.

## 5. Company management

**Kebab menu** per company (both sections): "Edit" and "Remove". Menu recipe, 13px items, soft hover.

**Edit modal**: title "Edit company". Fields in order: Careers page link, then Company name (link first, matching the add flow). Footer note, 12px muted: "Role keywords apply to every company. Change them in Settings." Actions: ghost Cancel, solid "Save changes".

**Remove flow**: selecting Remove opens a confirmation modal first; nothing is removed on the menu click itself.
- Title: "Remove {Company}?"
- Body: "Its open roles will no longer show here and alerts will stop. You can add the company again anytime."
- Actions: ghost "Cancel", ghost "Remove" (ink text). Remove must not use the primary button.
- On confirm: fade the card or quiet row out, snackbar "{Company} removed from your watchlist." Data is deleted per product rules (the company and its postings; application records are untouched).

**Add company modal** (from the header ghost button): title "Add a company". Fields:
1. **Careers page link** (first). Placeholder "https://...".
2. **Company name**. Auto-fills from the link as the user types or pastes: derive from the domain slug; for recognized ATS hosts (greenhouse, lever, ashby, workday, smartrecruiters) derive from the board path instead. When auto-filled, show a note under the field, 14px gold-text: "Filled in from the link. Edit it if it looks off." The note disappears the moment the user edits the name, and their text is never overwritten afterward.
3. No alerts checkbox; alerts default to on silently and are managed from the bell afterward.
4. Actions: ghost Cancel, solid "Add company".
5. On save: snackbar "{Company} added. Checking its board for matching roles now." Backfill runs immediately so the first render of the new company is never empty if matches exist.

Keywords are global (Settings), never per company. No keyword UI appears anywhere on this screen or its modals.

## 6. Tooltips

Custom tooltip component on all icon controls (bell, kebab, open posting, log application) and on the flame: dark pill in snack tokens (snack-bg, snack-text), 12px, 8px padding, 8px radius, fade and 3px slide over .2s ease.

Placement: below the control by default. Flip above only when there is not enough viewport room beneath. Use the shadcn Tooltip with bottom as the preferred side.

Tooltip strings: bell "Alerts", kebab "More", title-line arrow "Open posting", plus "Log application", flame "New".

When a dropdown, modal, select, or date picker is open, tooltips are hidden and hover states below the open surface do not respond until it closes.

## 7. Data model notes

1. Posting gains a `locations[]` array (or equivalent grouping) so identical titles across locations render as one row with "City +N". The poller is responsible for grouping.
2. `first_seen` drives the flame: show while `now - first_seen < 48h`.
3. Freshest-match ordering: sort companies by max(`first_seen`) of their open matching postings, descending.
4. Applying creates an application record and does not delete the posting; the posting simply stops rendering on the Watchlist for this user (it is applied). If the posting later closes, `is_live` handles it as usual.
5. The bell maps to `alerts_on` on the company. It has no effect on this screen's rendering.

## 8. Copy strings (verbatim)

| Context | String |
|---|---|
| Quiet section, collapsed | Nothing open elsewhere right now |
| First-run invitation | Add a company you would fight for. We will watch its board for you. |
| Add-job modal hint (Watchlist origin only) | Saving adds this to your applications and clears it from the watchlist. |
| Note placeholder | Anything you want to remember about this one |
| Edit modal footer | Role keywords apply to every company. Change them in Settings. |
| Prefill note | Filled in from the link. Edit it if it looks off. |
| Remove modal body | Its open roles will no longer show here and alerts will stop. You can add the company again anytime. |
| Snackbar, applied | Application logged. |
| Snackbar, removed | {Company} removed from your watchlist. |
| Snackbar, added | {Company} added. Checking its board for matching roles now. |
| Snackbar, alerts on | Alerts on. New matching roles will reach your inbox. |
| Snackbar, alerts off | Alerts paused for this company. |

All copy follows AGENTS.md section 6. One exception is codified here: location mode labels (Remote, Hybrid, On-site) are capitalized.

## 9. Build checklist

1. Company card with head (name, bell, kebab) and role rows (flame slot, two-line role block, open-posting button, add-application plus).
2. Flame rendering from `first_seen`, 48 hour window, tooltip, non-interactive.
3. Natural title truncation (flex min-width 0, ellipsis), full title on hover.
4. Multi-location "City +N" with hover list.
5. Quiet section disclosure with compact management rows.
6. Add-job modal prefill path from role rows, with Watchlist-only hint line, status select (overlay-aligned), themed calendar popover, note field.
7. Remove confirmation modal and edit modal (link first).
8. Add company modal with slug prefill and dismissable note.
9. Tooltips below-first on all icon controls.
10. Snackbars per section 8.
11. All popovers and modals close on Esc and outside click; focus is trapped in modals; every icon-only button has an aria-label matching its tooltip.
12. Every icon is a real SVG/icon component, never a text glyph. This includes kebab, plus, chevrons, checks, arrows, calendar, bell, and flame.
