import { describe, expect, it } from 'vitest';
import {
  combineVerdicts,
  isFinalVerdict,
  judge0StatusToVerdict,
} from './grader.js';

describe('judge0StatusToVerdict', () => {
  it('maps accepted', () => {
    expect(judge0StatusToVerdict(3)).toBe('AC');
  });
  it('maps wrong answer', () => {
    expect(judge0StatusToVerdict(4)).toBe('WA');
  });
  it('maps TLE', () => {
    expect(judge0StatusToVerdict(5)).toBe('TLE');
  });
  it('maps compilation error', () => {
    expect(judge0StatusToVerdict(6)).toBe('CE');
  });
  it('maps runtime errors 7..12 to RE', () => {
    for (let i = 7; i <= 12; i++) {
      expect(judge0StatusToVerdict(i)).toBe('RE');
    }
  });
  it('maps internal error to IE', () => {
    expect(judge0StatusToVerdict(13)).toBe('IE');
  });
});

describe('combineVerdicts', () => {
  it('returns AC when all AC', () => {
    expect(combineVerdicts(['AC', 'AC', 'AC'])).toBe('AC');
  });
  it('returns worst across mixed', () => {
    expect(combineVerdicts(['AC', 'WA', 'AC'])).toBe('WA');
    expect(combineVerdicts(['AC', 'WA', 'TLE'])).toBe('TLE');
    expect(combineVerdicts(['AC', 'CE'])).toBe('CE');
  });
});

describe('isFinalVerdict', () => {
  it('treats pending/running as non-final', () => {
    expect(isFinalVerdict('PENDING')).toBe(false);
    expect(isFinalVerdict('RUNNING')).toBe(false);
  });
  it('treats AC/WA as final', () => {
    expect(isFinalVerdict('AC')).toBe(true);
    expect(isFinalVerdict('WA')).toBe(true);
  });
});
