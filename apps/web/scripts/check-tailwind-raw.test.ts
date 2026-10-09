import { findRawClasses, isChecked } from './check-tailwind-raw.mjs';

describe('check-tailwind-raw', () => {
  it('LP13 flags text-[#2F5BEA] and p-[13px]', () => {
    const src = `export const A = () => <p className="text-[#2F5BEA] p-[13px] font-bold">x</p>;`;
    expect(findRawClasses(src)).toEqual([
      { line: 1, match: 'text-[#2F5BEA]' },
      { line: 1, match: 'p-[13px]' },
    ]);
  });

  it('LP13 ignores a line marked raw-ok', () => {
    const src = ['// raw-ok: third-party size', `const c = cn('w-[37px]');`].join('\n');
    expect(findRawClasses(src)).toEqual([]);
  });

  it('LP13 ignores md:hidden; flags data-[state=open]:x', () => {
    expect(findRawClasses(`<div className="md:hidden scale-86" />`)).toEqual([]);
    expect(findRawClasses(`<div className="data-[state=open]:x" />`)).toEqual([{ line: 1, match: 'data-[state=open]:x' }]);
  });

  it('LP13 skips next/og image routes and tests, checks every other tsx', () => {
    expect(['opengraph-image.tsx', 'apple-icon.tsx', 'icon.tsx', 'Hero.test.tsx'].map(isChecked)).toEqual([false, false, false, false]);
    expect(['Hero.tsx', 'page.tsx', 'iconography.tsx'].map(isChecked)).toEqual([true, true, true]);
  });

  it('LP13 flags inline style attributes', () => {
    expect(findRawClasses(`<div style={{ color: 'red' }} />`)).toEqual([{ line: 1, match: 'style={' }]);
  });
});
