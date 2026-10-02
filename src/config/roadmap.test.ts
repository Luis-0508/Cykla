import { describe, expect, it } from 'vitest';
import { LANGUAGES, SUPPORTED_LANGUAGES } from '@/i18n/i18n';
import { ROADMAP_NOT_PLANNED, ROADMAP_PHASES } from './roadmap';

const STAGE_ORDER = ['released', 'now', 'next', 'later'];

describe('roadmap data', () => {
  it('orders phases from released to later with exactly one current phase', () => {
    const ranks = ROADMAP_PHASES.map((phase) => STAGE_ORDER.indexOf(phase.stage));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(ROADMAP_PHASES.filter((phase) => phase.stage === 'now')).toHaveLength(1);
  });

  it('uses unique item ids', () => {
    const ids = ROADMAP_PHASES.flatMap((phase) => phase.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SUPPORTED_LANGUAGES)('%s has text for every phase and item', (language) => {
    const { roadmap } = LANGUAGES[language].messages;
    for (const phase of ROADMAP_PHASES) {
      expect(roadmap.phases[phase.id].title.trim()).not.toBe('');
      expect(roadmap.phases[phase.id].summary.trim()).not.toBe('');
      for (const item of phase.items) expect(roadmap.items[item.id].trim()).not.toBe('');
    }
    for (const id of ROADMAP_NOT_PLANNED) expect(roadmap.notPlanned[id].trim()).not.toBe('');
  });
});
