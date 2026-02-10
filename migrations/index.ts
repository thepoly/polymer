import * as migration_20260210_015823_initial_baseline from './20260210_015823_initial_baseline';

export const migrations = [
  {
    up: migration_20260210_015823_initial_baseline.up,
    down: migration_20260210_015823_initial_baseline.down,
    name: '20260210_015823_initial_baseline'
  },
];
