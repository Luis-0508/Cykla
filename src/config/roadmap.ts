import type Ionicons from '@expo/vector-icons/Ionicons';

// Structure of the in-app roadmap. Mirrors docs/ROADMAP.md; keep both in sync.
// All user-facing text lives in the `roadmap` section of the i18n catalogs,
// keyed by the phase and item ids below.

export type RoadmapStage = 'released' | 'now' | 'next' | 'later';

type IconName = keyof typeof Ionicons.glyphMap;

export const ROADMAP_PHASES = [
  {
    id: 'mvp',
    version: '0.1',
    stage: 'released',
    items: [
      { id: 'onboarding', icon: 'flag-outline' },
      { id: 'tracking', icon: 'calendar-outline' },
      { id: 'prediction', icon: 'eye-outline' },
      { id: 'statistics', icon: 'stats-chart-outline' },
      { id: 'protection', icon: 'lock-closed-outline' },
      { id: 'languages', icon: 'language-outline' },
    ],
  },
  {
    id: 'hardening',
    version: '0.2',
    stage: 'now',
    items: [
      { id: 'encryption', icon: 'key-outline' },
      { id: 'tests', icon: 'checkmark-done-outline' },
      { id: 'accessibility', icon: 'accessibility-outline' },
      { id: 'reviews', icon: 'document-text-outline' },
      { id: 'migrations', icon: 'server-outline' },
    ],
  },
  {
    id: 'extended',
    version: '0.3',
    stage: 'next',
    items: [
      { id: 'bodySignals', icon: 'thermometer-outline' },
      { id: 'symptoms', icon: 'options-outline' },
      { id: 'noteSearch', icon: 'search-outline' },
      { id: 'comparisons', icon: 'git-compare-outline' },
      { id: 'devMode', icon: 'flask-outline' },
    ],
  },
  {
    id: 'later',
    version: null,
    stage: 'later',
    items: [
      { id: 'sync', icon: 'sync-outline' },
      { id: 'health', icon: 'heart-outline' },
      { id: 'pregnancy', icon: 'flower-outline' },
      { id: 'education', icon: 'book-outline' },
    ],
  },
] as const satisfies readonly {
  id: string;
  version: string | null;
  stage: RoadmapStage;
  items: readonly { id: string; icon: IconName }[];
}[];

export const ROADMAP_NOT_PLANNED = ['ads', 'paywalls', 'aiDiagnosis', 'contraception'] as const;

export type RoadmapPhase = (typeof ROADMAP_PHASES)[number];
export type RoadmapPhaseId = RoadmapPhase['id'];
export type RoadmapItemId = RoadmapPhase['items'][number]['id'];
export type RoadmapNotPlannedId = (typeof ROADMAP_NOT_PLANNED)[number];
