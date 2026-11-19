import { topicSlot, topicStep } from './topic-arc';

describe('the landing arc', () => {
  it('keeps the phone step, fits wide screens, and stays within 150–230', () => {
    expect(topicStep(390)).toBe(128);
    expect(topicStep(767)).toBe(128);
    expect(topicStep(768)).toBe(150);
    expect(topicStep(1024)).toBe(150);
    expect(topicStep(1280)).toBeCloseTo(175.476, 2);
    expect(topicStep(1440)).toBeCloseTo(220.238, 2);
    expect(topicStep(2560)).toBe(230);
  });

  it('moves x with the step and keeps the app arc for the rest', () => {
    expect(topicSlot(2, 1440)).toMatchObject({ y: 64, rotate: 16, scale: 0.8, opacity: 0.5, z: 8 });
    expect(topicSlot(2, 1440).x).toBeCloseTo(370.0, 1);
    expect(topicSlot(-1, 390).x).toBeCloseTo(-107.52, 2);
    expect(topicSlot(0, 1440)).toMatchObject({ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, z: 10 });
  });
});
