import React from "react";
import type { Article as ComponentArticle } from "@/components/FrontPage/types";
import SectionSearchPrompt from "@/components/SectionSearchPrompt";
import FeaturesCover from "@/components/Features/FeaturesCover";
import FeaturesPhotoBand, { type FeaturesPhotoBandData } from "@/components/Features/FeaturesPhotoBand";
import FeaturesBrowse from "@/components/Features/FeaturesBrowse";
import type { FeaturesIndexStory } from "@/lib/featuresIndex";

const FEATURES_CONTACT_MAILTO =
  "mailto:features@poly.rpi.edu,eic@poly.rpi.edu?subject=Features%20Request%2FComment%20or%20Story%20Tip";

/** A Photo Spotlight photo as the layout editor stores it (the editor still edits these) */
export type SpotlightPhoto = {
  url: string;
  caption?: string;
  articleTitle?: string;
  articleUrl?: string;
  photographerName?: string;
  photographerUrl?: string;
};

/*
 * /features, top to bottom:
 *
 *   cover            FeaturesCover: the lead and six stories
 *   photo band       one pinned photo the editor picks (FeaturesPhotoBand)
 *   browse           FeaturesBrowse: the section list, a thin second window
 *                    onto the band's photo, and the index of every story
 *   search prompt    search, archive and contact
 */
export default function FeaturesSectionPage({
  title,
  articles,
  pinnedFeatured,
  pinnedRight,
  photoBand = null,
  indexStories = [],
}: {
  title: string;
  /** The newest Features stories, newest first */
  articles: ComponentArticle[];
  /** The editor's lead and the two stories under it */
  pinnedFeatured: ComponentArticle[];
  /** The editor's right-hand cover stories */
  pinnedRight: ComponentArticle[];
  /** The pinned photo between the cover and the sections; none when not set */
  photoBand?: FeaturesPhotoBandData | null;
  /** Every published Features story, for the section list and the index */
  indexStories?: FeaturesIndexStory[];
}) {
  // Fill each cover slot run: pinned first, then the newest unused stories
  const used = new Set<string>([...pinnedFeatured, ...pinnedRight].map((a) => String(a.id)));
  const fill = (pinned: ComponentArticle[], slotCount: number): ComponentArticle[] => {
    const result: ComponentArticle[] = [...pinned];
    for (const a of articles) {
      if (result.length >= slotCount) break;
      if (used.has(String(a.id))) continue;
      used.add(String(a.id));
      result.push(a);
    }
    return result;
  };

  // The lead and the two stories under it (the editor's Featured slots), three
  // on the right (its right-hand slots, then the newest) and the two newest
  // stories on the left, above the "featured" request box
  const featured = fill(pinnedFeatured, 3);
  const right = fill(pinnedRight, 3);
  const coverLeft = fill([], 2);
  const coverIds = [...featured, ...right, ...coverLeft].map((a) => a.id);

  return (
    // Side padding matches the site header's, so the page lines up with the
    // rule under the logo at every width
    <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-8 md:px-6 xl:px-[30px]">
      {/* Title, as on News. On desktop the masthead already marks Features
          (red, with a bar on the rule), so the title is for screen readers
          only and the page starts right under the header. The mobile header
          has no section links, so the title shows there, small. */}
      <h1
        className="mt-2 mb-6 text-center font-meta uppercase tracking-[0.04em] text-[#D6001C] dark:text-white transition-colors text-[32px] sm:text-[40px] lg:sr-only"
        style={{ fontWeight: 400, lineHeight: 1 }}
      >
        {title}
      </h1>

      <FeaturesCover
        lead={featured[0]}
        under={featured.slice(1, 3)}
        left={coverLeft}
        right={right}
        requestHref={FEATURES_CONTACT_MAILTO}
      />

      {photoBand && <FeaturesPhotoBand band={photoBand} />}

      <FeaturesBrowse stories={indexStories} band={photoBand} coverIds={coverIds} />

      {/* Search, archive and contact, where News has them */}
      <SectionSearchPrompt
        section="features"
        name="Features"
        archiveHref="/features/archive"
        contactHref={FEATURES_CONTACT_MAILTO}
      />
    </div>
  );
}
