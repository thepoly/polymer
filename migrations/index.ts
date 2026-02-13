import * as migration_20260211_224237_initial_baseline from './20260211_224237_initial_baseline';
import * as migration_20260213_223303_remove_copy_workflow from './20260213_223303_remove_copy_workflow';

export const migrations = [
  {
    up: migration_20260211_224237_initial_baseline.up,
    down: migration_20260211_224237_initial_baseline.down,
    name: '20260211_224237_initial_baseline',
  },
  {
    up: migration_20260213_223303_remove_copy_workflow.up,
    down: migration_20260213_223303_remove_copy_workflow.down,
    name: '20260213_223303_remove_copy_workflow'
  },
];
