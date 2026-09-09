# Focal point for photofeature images

**Status:** brainstorm — nothing implemented. Opened to pick an approach before
writing code.

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

## Recommendation

**A, with D as the fallback, and B only if it turns out we need it.**

Reading `media.focalX`/`focalY` is free — no migration, no new field, no
editor training, and it fixes every surface that crops an image, not just the
hero. Where a photo has no focal point set, fall back to a top-biased default
rather than dead centre.

I would not add the article-level override until an editor actually hits a
case where the photofeature needs different framing from the image's own
focal point. It is easy to add later; the migration is four nullable columns
and `gradientOpacity` shows exactly how.

I would skip C. Automatic cropping that cannot be corrected is how you get a
headline photo centred on a lamppost.

## Open questions

1. **Is the focal-point selector actually visible in the Media admin?** The
   config enables it by default and the columns exist, but I have not clicked
   through the UI to confirm the control renders. Worth verifying before
   committing to option A.
2. **How many existing images have a non-default focal point?** If the answer
   is zero, option A fixes nothing until editors start setting them — which
   makes the option D default the thing actually doing the work on day one.
3. **Should this apply beyond the photofeature hero?** The same `object-cover`
   crop happens in section cards and the homepage. The ask was photofeature
   only, but option A would improve all of them for free.
4. **What is the right fallback?** `35%` is a guess. If we have a sample of
   heroes that currently crop badly, we could pick a number that fixes most
   of them.
