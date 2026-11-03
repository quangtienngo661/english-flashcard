import { describe, expect, it } from 'vitest';
import { headingIds, linkContents, outlineOf, slugify } from './legal-outline';

describe('slugify (the id a section heading gets, for a #link to it)', () => {
  it('lowercases, drops Vietnamese marks and đ, and joins words with hyphens', () => {
    expect(slugify('1. Về chính sách này')).toBe('1-ve-chinh-sach-nay');
    expect(slugify('Hành vi bị cấm')).toBe('hanh-vi-bi-cam');
    expect(slugify('Đổi, Đặt hàng!')).toBe('doi-dat-hang');
  });

  it('is "section" for text without a letter or digit', () => {
    expect(slugify('—')).toBe('section');
  });
});

describe('outlineOf (the ## and ### headings of a Markdown text)', () => {
  it('lists them in order with unique ids, skipping the # title and anything inside a code fence', () => {
    const source = '# Tiêu đề\n\n## 1. Một\n\n### Con\n\n```\n## không phải mục\n```\n\n## Một\n\n## Một\n';
    expect(outlineOf(source)).toEqual([
      { level: 2, text: '1. Một', id: '1-mot' },
      { level: 3, text: 'Con', id: 'con' },
      { level: 2, text: 'Một', id: 'mot' },
      { level: 2, text: 'Một', id: 'mot-2' },
    ]);
  });

  it('reads the heading text as it is drawn: no bold marks, no link syntax', () => {
    expect(outlineOf('## **Quyền** của [bạn](/vi/privacy)\n')).toEqual([{ level: 2, text: 'Quyền của bạn', id: 'quyen-cua-ban' }]);
  });

  it('is empty when there is no ## section', () => {
    expect(outlineOf('# Chỉ có tiêu đề\n\ntext\n')).toEqual([]);
  });
});

describe('headingIds (hands the ids back in the order the headings are drawn)', () => {
  it('gives the same id outlineOf listed, one by one, and slugifies a heading it did not list', () => {
    const next = headingIds(outlineOf('## Một\n\n## Một\n'));
    expect(next('Một')).toBe('mot');
    expect(next('Một')).toBe('mot-2');
    expect(next('Lạ')).toBe('la');
  });
});

describe('linkContents (makes a hand-written Mục lục list clickable)', () => {
  const source = '**Mục lục**\n1. Một\n2. Hai\n3. Ba [x]\n4. Bốn\n\nLiên hệ\n\n## 1. Một\n\n## 2. Hai\n\n## 3. Ba [x]\n\n## Liên hệ\n';
  const lines = linkContents(source, outlineOf(source)).split('\n');

  it('links each item to the section of the same name, whatever its number', () => {
    expect(lines).toContain('1. [Một](#1-mot)');
    expect(lines).toContain('2. [Hai](#2-hai)');
  });

  it('links the single line under the list too, when it names a section', () => {
    expect(lines).toContain('[Liên hệ](#lien-he)');
  });

  it('leaves an item as text when no section has its name or when it holds square brackets', () => {
    expect(lines).toContain('3. Ba [x]');
    expect(lines).toContain('4. Bốn');
  });

  it('keeps the headings as they were', () => {
    expect(lines).toContain('## 1. Một');
    expect(lines).toContain('## Liên hệ');
  });

  it('also links bullet items and an English label', () => {
    const text = '**Contents**\n- Một\n\n## Một\n';
    expect(linkContents(text, outlineOf(text)).split('\n')).toContain('- [Một](#mot)');
  });

  it('changes nothing when the text has no Mục lục label', () => {
    const text = '1. Một\n\n## Một\n';
    expect(linkContents(text, outlineOf(text))).toBe(text);
  });
});
