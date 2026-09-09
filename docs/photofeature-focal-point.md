# Focal point for photofeature images

**Status:** decided and implemented — **option A**. The analysis below is kept
as the record of why, and options B–D remain the shortlist if A proves
insufficient.

**Problem:** the photofeature hero crops to the viewport and cuts people's
heads off.

## What actually happens today

`components/Article/Photofeature/ArticleHeader.tsx:43` puts the hero in a
fixed `h-screen` box and fills it:

```tsx
<div className="relative w-full h-screen mb-10 bg-black text-white">
  <Image src={…} fill className="object-cover opacity-90" sizes="100vw" priority />
```

`object-cover` scales the photo to cover the box and throws away the overflow.
With no `object-position`, CSS defaults to `50% 50%` — it crops evenly from
both edges.

That is the whole bug. A 3:2 photo in a 16:9 viewport loses ~25% of its height,
split top and bottom. Subjects are almost never vertically centred in a news
photo — they are in the upper third — so the top crop takes faces first. The
taller and narrower the viewport, the worse it gets: on a phone in portrait,
a landscape hero can lose more than half its height.

Nothing about this is specific to a bad photo. It is a framing decision the
layout is currently making at random.

## What we already have, unused

**`media.focalX` and `media.focalY` already exist.** They are in the initial
baseline (`migrations/20260211_224237_initial_baseline.ts:65`), in the
production SQL path (`scripts/run_deploy_sql_migrations.sh:329`), and typed in
`payload-types.ts:248`. Payload enables the focal-point selector on any upload
collection unless you turn it off — `focalPoint: focalPointEnabled = true` in
`payload/dist/uploads/generateFileData.js:50` — and `Media` never turns it off.

So editors can *already* drag a focal point on any image in the admin, the
values are *already* persisted in both environments, and **nothing in the
frontend has ever read them.**

That changes the shape of this problem considerably. The cheapest option is
not "add a field", it is "read the field we already have".

## Options

### A. Consume `media.focalX` / `focalY`

Map the stored point straight onto the CSS:

```tsx
style={{ objectPosition: `${media.focalX ?? 50}% ${media.focalY ?? 50}%` }}
```

- **Migration:** none. Columns exist in both paths.
- **Editor work:** none beyond setting the point, which is already in the UI.
- **Catch:** the focal point is a property of the *image*, so it applies
  everywhere that image appears — hero, cards, gallery, OG image. That is
  arguably correct (a photo's subject doesn't move), but it is not
  "photofeature only" as asked.

### B. Photofeature-scoped override on `articles`

Add `focalX` / `focalY` numbers to `Articles`, gated on `isPhotofeature`,
exactly mirroring `gradientOpacity` (`collections/Articles.ts:372`) — same
sidebar position, same `condition: Boolean(data?.isPhotofeature)`.

- **Migration:** required, both paths, four columns — `articles.focal_x`,
  `articles.focal_y`, and the `_articles_v.version_*` shadows. The pattern is
  `migrations/20260331_100000_add_photofeature.ts`, which added
  `is_photofeature` and `gradient_opacity` the same way. Nullable numerics, no
  backfill needed.
- **Editor work:** a second focal point to set, only for photofeatures.
- **Catch:** two sources of truth for "where is the subject". Needs a clear
  precedence rule and an admin description saying which wins.

### C. Compute it automatically

`sharp` is already a dependency and ships `strategy.attention` / `entropy`,
which find the busiest region without any ML model. Sample at render and
memoise per image, the way `lib/imageLuminance.ts` already does for gallery
credits.

- **Migration:** none.
- **Editor work:** none.
- **Catch:** attention-based cropping finds contrast, not faces. It will
  happily centre on a bright sign behind someone's head. No editor recourse
  when it is wrong, which is the exact failure we are trying to eliminate.

Real face detection would mean a new dependency and a model on the deploy
host. That is a much larger conversation and probably not worth it for the
handful of photofeatures we publish.

### D. Do nothing structural — bias the crop

`object-position: 50% 35%` as a blanket default, or clamp the hero's aspect
ratio so it never crops as aggressively.

- **Migration:** none. One line.
- **Catch:** crude, but it is strictly better than `50% 50%` for news photos
  and costs nothing. Worth taking regardless of what else we pick.

## What was implemented

Option A. `utils/focalPoint.ts` turns an upload's focal point into a CSS
`object-position`, and the photofeature header applies it to every photo it
crops — the hero, author headshots, and write-in author photos. No migration:
the columns already existed.

One thing had to be unblocked first. The article route sanitises media through
a field whitelist (`toPublicArticleMedia`, and `toPublicArticleUser` for
headshots) before handing it to the client component, and that whitelist
dropped `focalX`/`focalY`. Reading the stored focal point was necessary but
not sufficient — the value has to survive the trip to the component, so both
sanitisers now carry it.

Verified end to end against a real photofeature by moving the focal point in
the database and watching the crop follow:

| stored focal point | rendered |
| --- | --- |
| `null` / never set | `50% 50%` |
| `62 / 18` | `62% 18%` |
| `12 / 8` | `12% 8%` |
| `150 / -20` | `100% 0%` (clamped) |

## Deliberately not done

**The top-biased fallback (option D) was left out.** Payload writes `50/50` for
any upload whose point has never been moved, so an untouched image is
indistinguishable from a deliberately centred one. Applying a bias would
silently override editors who meant centre, and it cannot be scoped to only
the untouched images.

The consequence is worth stating plainly: **every image in the database
currently sits at `50/50`, so this changes nothing on screen until an editor
drags a focal point.** It makes the fix possible and puts the control in
editors' hands; it does not retroactively re-frame existing photofeatures.

If we would rather have unattended photos improve immediately, changing the
default in `focalObjectPosition` is a one-line change — but it is a product
decision about overriding editor intent, not a technical one.

## Still open

1. **Is the focal-point selector actually visible in the Media admin?** The
   config enables it by default, `Media` never disables it, and every row
   carries a written `50/50`, which is Payload's upload pipeline populating
   the default — strong evidence the control is live. Not clicked through.
2. **Should this extend beyond photofeatures?** The same `object-cover` crop
   happens in section cards and on the homepage. The ask was photofeature
   only, and that is what this does, but the helper is generic and those
   surfaces would benefit for free.
3. **Does an article-level override (option B) turn out to be needed?** Only
   if a photofeature wants different framing from the image's own focal
   point. Four nullable columns in both migration paths when that day comes.
