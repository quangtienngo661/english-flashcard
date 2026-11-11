// A stand-in for the two API reads the public pages make on the server (M8.9): `GET /v1/legal/current` and `GET /v1/sources`. They are
// server fetches, so the browser routing of mock-api.ts cannot answer them. The second e2e Worker (port 3101, playwright.config.ts) reads
// this server through API_INTERNAL_BASE_URL; the first one (3100) has no API at all, so the draft and "no sources" states stay covered.
// Every other path is a 404. The texts are test data, not the published policy.
import { createServer } from 'node:http';

const PORT = Number(process.env.PUBLIC_API_PORT ?? 3199);

const paragraph = (topic) =>
  `Đoạn này mô tả ${topic}. Wordmet chỉ giữ những gì cần để bạn học tiếp trên mọi máy, và không bán dữ liệu cho bên nào.`;

const privacy = [
  '## 1. Dữ liệu Wordmet thu thập',
  paragraph('dữ liệu khi bạn tạo tài khoản'),
  '- **Email** và mật khẩu đã băm',
  '- Họ, tên và ngày sinh',
  '- Từ, nhóm từ và lịch ôn của bạn',
  '## 2. Wordmet dùng dữ liệu vào việc gì',
  paragraph('việc xếp lịch ôn và gửi email nhắc'),
  paragraph('việc tính lượt luyện của từng gói'),
  '### Email nhắc ôn',
  paragraph('email nhắc ôn và cách tắt nó'),
  '## 3. Chia sẻ dữ liệu với ai',
  paragraph('các bên xử lý thanh toán và gửi email'),
  'Thanh toán đi qua [payOS](https://payos.vn).',
  '## 4. Quyền của bạn',
  paragraph('quyền xem, sửa và xóa dữ liệu'),
  paragraph('cách xóa tài khoản trong Cài đặt'),
  '## 5. Liên hệ',
  'Gửi câu hỏi tới support@wordmet.com.',
].join('\n\n');

const terms = [
  '## 1. Tài khoản',
  paragraph('điều kiện tạo tài khoản'),
  '## 2. Gói Pro và thanh toán',
  paragraph('các kỳ của gói Pro'),
  '> Gói Pro không tự gia hạn.',
  '## 3. Hoàn tiền',
  paragraph('việc không hoàn tiền sau khi đã thanh toán'),
  '## 4. Nội dung của bạn',
  paragraph('từ và câu bạn tự thêm'),
  '## 5. Thay đổi điều khoản',
  paragraph('cách Wordmet báo khi điều khoản đổi'),
].join('\n\n');

const LEGAL = {
  version: '3',
  effective_date: '2026-11-01',
  privacy: { vi: privacy, en: null },
  terms: { vi: terms, en: null },
};

const SOURCES = {
  items: [
    {
      name: 'CEFR-J Wordlist',
      version: '1.6',
      url: 'https://www.cefr-j.org/download.html',
      license: 'CC BY-SA 4.0',
      attribution: 'CEFR-J Wordlist Version 1.6. Tono Laboratory, Tokyo University of Foreign Studies.',
    },
    {
      name: 'Octanove Vocabulary Profile',
      version: '1.0',
      url: 'https://github.com/octanove/octanove-vocabulary-profile-c1c2',
      license: 'CC BY-SA 4.0',
      attribution: 'Octanove Vocabulary Profile C1/C2, Octanove Labs.',
    },
    // The row of migration 20261017220000_agid_source, shortened; `url: null` checks a source with no link.
    {
      name: 'AGID',
      version: '2016.01.19',
      url: null,
      license: 'Copyright 2000-2014 by Kevin Atkinson. Permission to use, copy, modify, distribute and sell this database for any purpose is hereby granted without fee.',
      attribution: 'Automatically Generated Inflection Database (AGID) by Kevin Atkinson; part-of-speech data from WordNet 1.6.',
    },
  ],
};

const ROUTES = { '/v1/legal/current': LEGAL, '/v1/sources': SOURCES };

createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://x').pathname;
  // Playwright waits for this path before it starts the Worker that reads the server.
  if (path === '/health') return response.writeHead(200).end('ok');
  const body = request.method === 'GET' ? ROUTES[path] : undefined;
  if (!body) return response.writeHead(404, { 'content-type': 'application/problem+json' }).end('{"status":404}');
  response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
}).listen(PORT, '127.0.0.1');
