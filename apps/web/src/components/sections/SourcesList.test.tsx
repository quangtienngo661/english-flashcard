// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import type { PublicSource } from '@/lib/sources';
import { SourcesList } from './SourcesList';

const labels = { title: 'Nguồn dữ liệu', intro: 'Wordmet dùng các bộ dữ liệu có giấy phép mở sau đây.', empty: 'Chưa có nguồn nào để hiển thị.', license: 'Giấy phép', version: 'Phiên bản', link: 'Trang gốc' };
const cefr: PublicSource = { name: 'CEFR-J', version: '1.6', url: 'https://www.cefr-j.org', license: 'CC BY-SA 4.0', attribution: 'Tono Yukio et al. (2020)' };
const agid: PublicSource = { name: 'AGID', version: '2016.01.19', url: null, license: 'Notice below', attribution: 'Copyright 1997 by Princeton University.' };

describe('SourcesList', () => {
  it('has a level-one heading and the intro', () => {
    render(<SourcesList sources={[cefr]} labels={labels} />);
    expect(screen.getByRole('heading', { level: 1, name: labels.title })).toBeInTheDocument();
    expect(screen.getByText(labels.intro)).toBeInTheDocument();
  });

  it('shows each source in order with its name, version, licence, attribution and a link that opens a new tab safely', () => {
    render(<SourcesList sources={[cefr, agid]} labels={labels} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    const first = within(items[0]);
    expect(first.getByRole('heading', { level: 2, name: 'CEFR-J' })).toBeInTheDocument();
    expect(first.getByText('1.6')).toBeInTheDocument();
    expect(first.getByText('CC BY-SA 4.0')).toBeInTheDocument();
    expect(first.getByText('Tono Yukio et al. (2020)')).toBeInTheDocument();
    const link = first.getByRole('link', { name: new RegExp(labels.link) });
    expect(link).toHaveAttribute('href', 'https://www.cefr-j.org');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(items[1]).getByRole('heading', { level: 2, name: 'AGID' })).toBeInTheDocument();
  });

  it('a source without a url has no link', () => {
    render(<SourcesList sources={[agid]} labels={labels} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('a url that is not http(s) is not made a link', () => {
    render(<SourcesList sources={[{ ...cefr, url: 'javascript:alert(1)' }]} labels={labels} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('an empty version or licence is left out instead of showing a label with nothing after it', () => {
    render(<SourcesList sources={[{ ...agid, version: '', license: '' }]} labels={labels} />);
    expect(screen.queryByText(labels.version)).toBeNull();
    expect(screen.queryByText(labels.license)).toBeNull();
  });

  it('the attribution is plain text: markup in it is shown, not rendered', () => {
    const attribution = '<b>bold</b> **x** [a](http://evil.example)';
    render(<SourcesList sources={[{ ...agid, attribution }]} labels={labels} />);
    expect(screen.getByText(attribution)).toBeInTheDocument();
    expect(document.querySelector('b')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('null (the API failed) and an empty list both show the same sentence, no error and no list', () => {
    for (const sources of [null, []]) {
      const { unmount } = render(<SourcesList sources={sources} labels={labels} />);
      expect(screen.getByText(labels.empty)).toBeInTheDocument();
      expect(screen.queryByRole('list')).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      unmount();
    }
  });
});
