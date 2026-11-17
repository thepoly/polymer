# Filling blank space: fitted type and balanced columns

Two tools, for two sizes of the same problem:

- [`FitGroup`](../components/FitGroup.tsx) grows type inside one story, so its
  text ends where its photo does.
- [`BalanceColumns`](../components/BalanceColumns.tsx) makes two columns of a
  page end on the same line.

## FitGroup: type that fills the space beside a photo

Stories laid out beside a photo rarely end where the photo does. A short
subdeck leaves a gap under the text; a long one runs past the photo. In print
the layout editor fixes this by hand. On the site, [`FitGroup`](../components/FitGroup.tsx)
does it: headlines (and, less, subdecks) grow until the text fills the
photo's height.

### How it decides the size

All stories in a group share one scale, `--fit`. It's the largest step
between `min` and `max` at which **every** story's text still fits its box.
The wordiest story fills its box; the others take the same size and keep a
little space. That keeps a set of stories looking like a set: two headlines
side by side at different sizes read as a mistake.

If a story doesn't fit even at `min`, the group stays at `min` and that story
runs longer than its photo. A short headline can't grow past `max`.

It refits when the group's width changes, when its `when` media query starts
or stops matching, and after web fonts load. The text is hidden until the
first fit (a CSS rule in `app/(frontend)/globals.css`) so it never visibly
jumps size; without scripts it shows at its base size after 1.2 s.

### Using it

1. Wrap the stories in `<FitGroup>` (a client component; the stories inside
   can stay server components).
2. On each story, mark:
   - `data-fit-item` on the story
   - `data-fit-target` on the box to fill, usually the photo. Its height must
     not depend on the text (a fixed `aspect-ratio` is ideal).
   - `data-fit-content` on the text block. It must keep its natural height:
     in a grid or flex row use `items-start` / `self-start`, not stretch.
3. Multiply the font sizes that should grow by `var(--fit, 1)`:

   ```tsx
   // Headline: full scale
   style={{ fontSize: "calc(clamp(21px, 2vw, 25px) * var(--fit, 1))" }}
   // Subdeck: half as much
   style={{ fontSize: "calc(15px * (1 + (var(--fit, 1) - 1) * 0.5))" }}
   ```

   Kickers, bylines and spacing usually stay fixed.

Props: `min` (default 1, the base size), `max` (default 1.4), `step`
(default 0.02, so sizes snap to the same steps everywhere) and `when` (e.g.
`"(min-width: 640px)"`: where text stacks under the photo on phones there's
nothing to fill, so `--fit` stays 1).

No page uses it at the moment: the stories under the lead on `/news` were its
first use, until they lost their photos and `BalanceColumns` took over their
sizing.

## BalanceColumns: two columns that end together

Two columns filled independently never end at the same height; the shorter
one leaves a hole. A print desk fixes that in a set order: add copy to the
short column, set its type larger, resize the art, then spread what's left
through the spacing. `BalanceColumns` does the same, in the browser, on every
load and resize.

### What it does

Each step runs only if a gap remains.

1. **Count.** The short column shows its optional content, in order, each
   piece only if it fits whole.
2. **Type, up.** The short column's type is scaled up, in steps of 2%, to the
   largest step at which it's still no taller than the other column.
3. **Art.** Type moves in jumps (lines rewrap), so what's left is closed by a
   flexible box, normally the lead photo: the short column's grows, or else
   the tall column's shrinks, within the limits the box sets. This is the
   step that makes the columns meet exactly.
4. **Type, down.** If a gap still remains and the tall column's range goes
   below 1, its type is scaled down, then the flexible boxes are tried again.
4a. **Reach.** If a gap still remains and the short column has a hidden
   `reach` option, steps 1–4 run again with the first one that didn't fit
   shown anyway. That column is now the long one, so the other column's type
   and photos grow to meet it (and its own photo shrinks). The result is kept
   only if the columns end closer than before.
5. **Trim.** If more than `feather` px (default 48) still remains and the
   tall column has trimmable content (summaries), it drops all of it and the
   routine starts over.
6. **Spacing.** A leftover of `feather` px or less is spread between the
   short column's blocks. A bigger one stays at the bottom, since a hole in
   the middle of a column reads worse than one at the end.

### No flash

On a first load the routine runs from an inline script placed right after the
columns, before the browser paints them, so nothing visibly appears or moves.
That script runs it again once web fonts have arrived (text measured in a
fallback font wraps differently) and when the page has loaded. After that
(client-side navigation, resizes) the component runs it. Without scripts the page shows its minimum: no optional content,
type at its base size, the photo at its normal shape.

Two consequences for anyone editing it:

- The routine (`balance` in the component file) is sent to the browser as
  text. It must stand alone: no imports or module helpers, and plain loops
  rather than spread, destructuring or `for...of`.
- The elements it changes are changed before React hydrates, so each needs
  `suppressHydrationWarning`.

### Using it

Wrap the two columns in `<BalanceColumns when="(min-width: 1024px)">`
(`when` is where they sit side by side; elsewhere nothing happens), and mark:

| Marker | On | Meaning |
| --- | --- | --- |
| `data-balance-col` | Each of the two columns (flex columns, grid items of the root) | What gets measured and levelled |
| `data-balance-opt` | Optional content | Hidden until there's room. Tried in document order; one nested in another waits for the outer one. `data-balance-opt="reach"` may also be shown when it doesn't fit, if the other column can then come closer to meeting it (step 4a) |
| `data-balance-scale="min,max"` | A column, or one element in it | The range its type may be scaled over. Text opts in with the CSS variable it's given: `font-size: calc(18px * var(--balance-scale, 1))`, or in part: `calc(46px * (1 + (var(--balance-scale, 1) - 1) * 0.5))` |
| `data-balance-flex="wide,tall"` | The photo box | May change height between width ÷ wide and width ÷ tall. Use the CSS variable it's given: `height: var(--balance-h, <normal height>)`. Several in one column share each change evenly; what one can't take passes to the rest |
| `data-balance-fold="widest"` | A flexible box near the top of the page | Kept short enough that the bottom of its nearest `data-balance-fold-end` is on the first screen as the page loads, going as wide as `widest` (e.g. `2` for 2:1) if it has to. This outranks squaring off, so on a short window the other column may end lower. Also follows changes to the window's height on computers (not on touch screens, where the toolbars change it while scrolling) |
| `data-balance-fold-end` | Around a fold-held box (the whole lead story) | What has to fit on the first screen. Without one, just the box |
| `data-balance-trim` | Summaries and the like | Dropped by the taller column as a last resort |

Give the type a rate that matches its rank: on `/news` the strips under the
lead take the full scale and the lead's own headline half of it, so the lead
stays the largest thing in its column.

If the photo's shape can change, readers see different crops on different
days. Give editors control of the framing (see the lead photo crop in the
News Layout editor, saved as `leadFrame`).

First use: the top of `/news`
([`components/News/NewsPage.tsx`](../components/News/NewsPage.tsx)).

| | Lead's column | Student Government column |
| --- | --- | --- |
| Options | With the lead's text above or below its photo: one strip (`reach`), shown if the column is short by a whole strip, or by enough that the Student Government column can grow to meet it | A third docket entry in a box set to two |
| Type | 1 to 1.5: strips in full, lead text at half. With the text above or below the photo, 1 to 1.25, and the lead's headline and subdeck stop at 48px and 18px | 0.9 to 1.45: docket entries and pinned stories; nameplates stay one size |
| Flexible box | The lead photo: 16:9 to 5:4, or up to square beside its text. Above, under or behind its text it's also held to the first screen (`data-balance-fold="2"`), as wide as 2:1 | Pinned stories' photos: 3:2 down to 2:1, sharing the change so both boxes keep one shape |
| Trims | None | Entries' and pinned stories' summaries |

## Other ways to close a gap

- **Let the photo follow the text.** The photo stretches to the text's height
  within limits (`NewsLead`'s east/west layouts: never shorter than 3:2 or
  taller than 4:5). CSS only, but the photo's crop changes per story.
- **Add or drop a line of content.** A subdeck's `line-clamp`, or showing
  the photo caption, fills space in steps rather than smoothly.
