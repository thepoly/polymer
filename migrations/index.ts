import * as migration_20260211_224237_initial_baseline from './20260211_224237_initial_baseline';
import * as migration_20260213_223303_remove_copy_workflow from './20260213_223303_remove_copy_workflow';
import * as migration_20260217_015404_add_photographer_to_media from './20260217_015404_add_photographer_to_media';
import * as migration_20260310_211734_add_user_slug from './20260310_211734_add_user_slug';
import * as migration_20260316_144021_add_layout_top4 from './20260316_144021_add_layout_top4';
import * as migration_20260316_145613_remove_editorial_section from './20260316_145613_remove_editorial_section';
import * as migration_20260317_200000_add_opinion_type_and_caption from './20260317_200000_add_opinion_type_and_caption';
import * as migration_20260320_200000_add_write_in_authors from './20260320_200000_add_write_in_authors';
import * as migration_20260321_055436_add_opinion_page_layout from './20260321_055436_add_opinion_page_layout';
import * as migration_20260321_200000_add_layout_template from './20260321_200000_add_layout_template';
import * as migration_20260321_210000_add_layout_sections_and_volume from './20260321_210000_add_layout_sections_and_volume';
import * as migration_20260322_200000_add_seo_fields from './20260322_200000_add_seo_fields';
import * as migration_20260322_210000_add_media_source_url from './20260322_210000_add_media_source_url';
import * as migration_20260322_220000_add_more_to_opinion_type_enum from './20260322_220000_add_more_to_opinion_type_enum';
import * as migration_20260322_230000_add_write_in_photographer_to_media from './20260322_230000_add_write_in_photographer_to_media';
import * as migration_20260322_231000_add_user_retired from './20260322_231000_add_user_retired';
import * as migration_20260324_220000_add_user_seen_newsroom_notice from './20260324_220000_add_user_seen_newsroom_notice';
import * as migration_20260328_000000_add_user_one_liner from './20260328_000000_add_user_one_liner';
import * as migration_20260328_100000_add_submissions from './20260328_100000_add_submissions';
import * as migration_20260328_200000_add_event_submissions from './20260328_200000_add_event_submissions';
import * as migration_20260328_300000_add_features_page_layout from './20260328_300000_add_features_page_layout';
import * as migration_20260329_100000_add_follytechnic from './20260329_100000_add_follytechnic';
import * as migration_20260331_100000_add_photofeature from './20260331_100000_add_photofeature';
import * as migration_20260401_000000_add_theme_and_logos from './20260401_000000_add_theme_and_logos';
import * as migration_20260401_010000_add_seo_global from './20260401_010000_add_seo_global';
import * as migration_20260402_000000_add_staff_page_layout from './20260402_000000_add_staff_page_layout';

export const migrations = [
  {
    up: migration_20260211_224237_initial_baseline.up,
    down: migration_20260211_224237_initial_baseline.down,
    name: '20260211_224237_initial_baseline',
  },
  {
    up: migration_20260213_223303_remove_copy_workflow.up,
    down: migration_20260213_223303_remove_copy_workflow.down,
    name: '20260213_223303_remove_copy_workflow',
  },
  {
    up: migration_20260217_015404_add_photographer_to_media.up,
    down: migration_20260217_015404_add_photographer_to_media.down,
    name: '20260217_015404_add_photographer_to_media',
  },
  {
    up: migration_20260310_211734_add_user_slug.up,
    down: migration_20260310_211734_add_user_slug.down,
    name: '20260310_211734_add_user_slug',
  },
  {
    up: migration_20260316_144021_add_layout_top4.up,
    down: migration_20260316_144021_add_layout_top4.down,
    name: '20260316_144021_add_layout_top4',
  },
  {
    up: migration_20260316_145613_remove_editorial_section.up,
    down: migration_20260316_145613_remove_editorial_section.down,
    name: '20260316_145613_remove_editorial_section',
  },
  {
    up: migration_20260317_200000_add_opinion_type_and_caption.up,
    down: migration_20260317_200000_add_opinion_type_and_caption.down,
    name: '20260317_200000_add_opinion_type_and_caption',
  },
  {
    up: migration_20260320_200000_add_write_in_authors.up,
    down: migration_20260320_200000_add_write_in_authors.down,
    name: '20260320_200000_add_write_in_authors',
  },
  {
    up: migration_20260321_055436_add_opinion_page_layout.up,
    down: migration_20260321_055436_add_opinion_page_layout.down,
    name: '20260321_055436_add_opinion_page_layout',
  },
  {
    up: migration_20260321_200000_add_layout_template.up,
    down: migration_20260321_200000_add_layout_template.down,
    name: '20260321_200000_add_layout_template',
  },
  {
    up: migration_20260321_210000_add_layout_sections_and_volume.up,
    down: migration_20260321_210000_add_layout_sections_and_volume.down,
    name: '20260321_210000_add_layout_sections_and_volume',
  },
  {
    up: migration_20260322_200000_add_seo_fields.up,
    down: migration_20260322_200000_add_seo_fields.down,
    name: '20260322_200000_add_seo_fields',
  },
  {
    up: migration_20260322_210000_add_media_source_url.up,
    down: migration_20260322_210000_add_media_source_url.down,
    name: '20260322_210000_add_media_source_url',
  },
  {
    up: migration_20260322_220000_add_more_to_opinion_type_enum.up,
    down: migration_20260322_220000_add_more_to_opinion_type_enum.down,
    name: '20260322_220000_add_more_to_opinion_type_enum',
  },
  {
    up: migration_20260322_230000_add_write_in_photographer_to_media.up,
    down: migration_20260322_230000_add_write_in_photographer_to_media.down,
    name: '20260322_230000_add_write_in_photographer_to_media',
  },
  {
    up: migration_20260322_231000_add_user_retired.up,
    down: migration_20260322_231000_add_user_retired.down,
    name: '20260322_231000_add_user_retired',
  },
  {
    up: migration_20260324_220000_add_user_seen_newsroom_notice.up,
    down: migration_20260324_220000_add_user_seen_newsroom_notice.down,
    name: '20260324_220000_add_user_seen_newsroom_notice',
  },
  {
    up: migration_20260328_000000_add_user_one_liner.up,
    down: migration_20260328_000000_add_user_one_liner.down,
    name: '20260328_000000_add_user_one_liner',
  },
  {
    up: migration_20260328_100000_add_submissions.up,
    down: migration_20260328_100000_add_submissions.down,
    name: '20260328_100000_add_submissions',
  },
  {
    up: migration_20260328_200000_add_event_submissions.up,
    down: migration_20260328_200000_add_event_submissions.down,
    name: '20260328_200000_add_event_submissions',
  },
  {
    up: migration_20260328_300000_add_features_page_layout.up,
    down: migration_20260328_300000_add_features_page_layout.down,
    name: '20260328_300000_add_features_page_layout',
  },
  {
    up: migration_20260329_100000_add_follytechnic.up,
    down: migration_20260329_100000_add_follytechnic.down,
    name: '20260329_100000_add_follytechnic',
  },
  {
    up: migration_20260331_100000_add_photofeature.up,
    down: migration_20260331_100000_add_photofeature.down,
    name: '20260331_100000_add_photofeature',
  },
  {
    up: migration_20260401_000000_add_theme_and_logos.up,
    down: migration_20260401_000000_add_theme_and_logos.down,
    name: '20260401_000000_add_theme_and_logos',
  },
  {
    up: migration_20260401_010000_add_seo_global.up,
    down: migration_20260401_010000_add_seo_global.down,
    name: '20260401_010000_add_seo_global',
  },
  {
    up: migration_20260402_000000_add_staff_page_layout.up,
    down: migration_20260402_000000_add_staff_page_layout.down,
    name: '20260402_000000_add_staff_page_layout',
  },
];
