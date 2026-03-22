import * as migration_20260211_224237_initial_baseline from './20260211_224237_initial_baseline';
import * as migration_20260213_223303_remove_copy_workflow from './20260213_223303_remove_copy_workflow';
import * as migration_20260217_015404_add_photographer_to_media from './20260217_015404_add_photographer_to_media';
import * as migration_20260310_211734_add_user_slug from './20260310_211734_add_user_slug';
import * as migration_20260316_144021_add_layout_top4 from './20260316_144021_add_layout_top4';
import * as migration_20260316_145613_remove_editorial_section from './20260316_145613_remove_editorial_section';
import * as migration_20260317_200000_add_opinion_type_and_caption from './20260317_200000_add_opinion_type_and_caption';
import * as migration_20260320_200000_add_write_in_authors from './20260320_200000_add_write_in_authors';
import * as migration_20260321_200000_add_layout_template from './20260321_200000_add_layout_template';
import * as migration_20260321_210000_add_layout_sections_and_volume from './20260321_210000_add_layout_sections_and_volume';
import * as migration_20260322_200000_add_seo_fields from './20260322_200000_add_seo_fields';
import * as migration_20260322_210000_add_media_source_url from './20260322_210000_add_media_source_url';

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
    name: '20260316_145613_remove_editorial_section'
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
];
