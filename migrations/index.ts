import * as migration_20260211_224237_initial_baseline from './20260211_224237_initial_baseline';
import * as migration_20260213_223303_remove_copy_workflow from './20260213_223303_remove_copy_workflow';
import * as migration_20260220_160000_add_opinion_type from './20260220_160000_add_opinion_type';
import * as migration_20260225_update_opinion_types from './20260225_update_opinion_types';

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
  {
    up: migration_20260220_160000_add_opinion_type.up,
    down: migration_20260220_160000_add_opinion_type.down,
    name: '20260220_160000_add_opinion_type'
  },
  {
    up: migration_20260225_update_opinion_types.up,
    down: migration_20260225_update_opinion_types.down,
    name: '20260225_update_opinion_types'
  },
];
