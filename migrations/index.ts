import * as migration_20260211_224237_initial_baseline from './20260211_224237_initial_baseline';
import * as migration_20260213_223303_remove_copy_workflow from './20260213_223303_remove_copy_workflow';
import * as migration_20260217_015404_add_photographer_to_media from './20260217_015404_add_photographer_to_media';
import * as migration_20260310_211734_add_user_slug from './20260310_211734_add_user_slug';
import * as migration_20260316_144021_add_layout_top4 from './20260316_144021_add_layout_top4';
import * as migration_20260316_145613_remove_editorial_section from './20260316_145613_remove_editorial_section';

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
];
