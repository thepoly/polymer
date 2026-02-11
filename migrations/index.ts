import * as migration_20260210_015823_initial_baseline from './20260210_015823_initial_baseline';
import * as migration_20260211_200936_fix_manual_changes from './20260211_200936_fix_manual_changes';

export const migrations = [
  {
    up: migration_20260210_015823_initial_baseline.up,
    down: migration_20260210_015823_initial_baseline.down,
    name: '20260210_015823_initial_baseline',
  },
  {
    up: migration_20260211_200936_fix_manual_changes.up,
    down: migration_20260211_200936_fix_manual_changes.down,
    name: '20260211_200936_fix_manual_changes'
  },
];
