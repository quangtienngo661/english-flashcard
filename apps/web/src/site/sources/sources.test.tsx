// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import vi_ from '../../../messages/vi.json';
import type { PublicSource } from '@/lib/sources';
import { SourcesPage } from './SourcesPage';

const cefr: PublicSource = {
  name: 'CEFR-J Wordlist',
  version: '1.5',
  url: 'https://github.com/openlanguageprofiles/olp-en-cefrj',
  license: 'Dùng miễn phí cho nghiên cứu và thương mại, cần trích dẫn.',
  attribution: 'The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies.',
};
const octanove: PublicSource = { name: 'Octanove Vocabulary Profile C1/C2', version: '1.0', url: 'https://octanove.com/', license: 'CC BY-SA 4.0', attribution: 'Octanove Labs.' };
const agid: PublicSource = { name: 'AGID', version: '2016.01.19', url: null, license: 'Notice below', attribution: 'Copyright 2000-2016 by Kevin Atkinson.' };

const draw = (items: PublicSource[] | null) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{ Sources: vi_.Sources }} timeZone="UTC">
      <SourcesPage items={items} />
    </NextIntlClientProvider>,
  );

/** True when the element or an ancestor carries a class that hides it on some widths (`hidden`, `max-md:hidden`…). */
const hiddenSomewhere = (element: HTMLElement) => {
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if ([...node.classList].some((name) => name === 'hidden' || /^max-[\w-]+:hidden$/.test(name))) return true;
  }
  return false;
};

describe('SourcesPage (M8.7, Figma 16:210 / 18:283)', () => {
  it('has the title, the lead and the auto-update note', () => {
    draw([cefr]);
    expect(screen.getByRole('heading', { level: 1, name: 'Nguồn dữ liệu' })).toBeInTheDocument();
    expect(screen.getByText('Wordmet dùng các bộ dữ liệu có giấy phép mở sau đây. Cảm ơn những người đã làm ra và chia sẻ chúng.')).toBeInTheDocument();
    expect(screen.getByText('Trang này tự cập nhật: chỉ hiện nguồn đang có từ người học nhìn thấy.')).toBeInTheDocument();
  });

  it('3 items: "3 nguồn đang dùng" and one heading per source, in order', () => {
    draw([cefr, octanove, agid]);
    expect(screen.getByRole('heading', { level: 2, name: '3 nguồn đang dùng' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['CEFR-J Wordlist', 'Octanove Vocabulary Profile C1/C2', 'AGID']);
  });

  it('a card shows "Phiên bản …", "Giấy phép: …", the attribution and "Trang gốc" opening a new tab safely', () => {
    draw([cefr]);
    const card = within(screen.getByRole('listitem'));
    expect(card.getByText('Phiên bản 1.5')).toBeInTheDocument();
    expect(card.getByText('Giấy phép: Dùng miễn phí cho nghiên cứu và thương mại, cần trích dẫn.')).toBeInTheDocument();
    const link = card.getByRole('link', { name: /^Trang gốc/ });
    expect(link).toHaveAttribute('href', 'https://github.com/openlanguageprofiles/olp-en-cefrj');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveTextContent('github.com/openlanguageprofiles/olp-en-cefrj');
  });

  it('QM8-5 the attribution is in the one DOM for every width, never hidden on a phone', () => {
    draw([cefr, octanove, agid]);
    for (const source of [cefr, octanove, agid]) expect(hiddenSomewhere(screen.getByText(source.attribution))).toBe(false);
  });

  it('QM8-5 no "Dùng cho" label', () => {
    draw([cefr, octanove, agid]);
    expect(screen.queryByText(/^Dùng cho/)).toBeNull();
  });

  it('a source without an http(s) address has no link', () => {
    draw([agid, { ...cefr, url: 'javascript:alert(1)' }]);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('an empty version or licence is left out instead of a label with nothing after it', () => {
    draw([{ ...agid, version: '', license: '' }]);
    expect(screen.queryByText(/^Phiên bản/)).toBeNull();
    expect(screen.queryByText(/^Giấy phép/)).toBeNull();
  });

  it('the attribution is plain text: markup in it is shown, not rendered', () => {
    const attribution = '<b>bold</b> **x** [a](http://evil.example)';
    draw([{ ...agid, attribution }]);
    expect(screen.getByText(attribution)).toBeInTheDocument();
    expect(document.querySelector('b')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('[] and null (the API failed) both show the empty sentence, no count and no list', () => {
    for (const items of [[], null]) {
      const { unmount } = draw(items);
      expect(screen.getByText('Hiện chưa có nguồn dữ liệu nào để hiển thị.')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
      expect(screen.queryByRole('list')).toBeNull();
      unmount();
    }
  });
});
