import * as migration_20260211_224237_initial_baseline from './20260211_224237_initial_baseline';
import * as migration_20260213_223303_remove_copy_workflow from './20260213_223303_remove_copy_workflow';
import * as migration_20260217_015404_add_photographer_to_media from './20260217_015404_add_photographer_to_media';

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
    name: '20260217_015404_add_photographer_to_media'
  },
];
