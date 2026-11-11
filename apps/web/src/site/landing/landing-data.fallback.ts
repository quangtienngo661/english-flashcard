import type { LandingData } from './landing-data';

/**
 * What the home page shows when `next build` could not read the API (M8.3): the seeded prices (design §10.6) and the six FAQ items
 * the M8.1 migration seeds, verbatim. Drafts the owner checks later (QM8-6); keep both copies equal.
 */
export const FALLBACK_LANDING_DATA: LandingData = {
  prices: { '1': 79000, '3': 199000, '12': 599000 },
  faq: [
    {
      question: 'Gói Pro có tự gia hạn không?',
      answer: 'Không. Bạn trả một lần cho mỗi kỳ 1, 3 hoặc 12 tháng. Hết kỳ, tài khoản về gói Miễn phí và Wordmet không tự trừ tiền.',
    },
    {
      question: 'Hết Pro thì từ và lịch ôn có mất không?',
      answer: 'Không. Từ, nhóm và lịch ôn của bạn vẫn còn. Bạn học tiếp với giới hạn của gói Miễn phí, ví dụ 3 phiên luyện mỗi ngày.',
    },
    {
      question: 'Dùng trên điện thoại được không?',
      answer: 'Được. Wordmet chạy trên trình duyệt của điện thoại và máy tính, không cần cài ứng dụng. Từ và lịch ôn giống nhau trên mọi máy.',
    },
    {
      question: 'Mua thêm khi Pro còn hạn thì sao?',
      answer: 'Kỳ mới bắt đầu ngay sau khi kỳ đang dùng kết thúc, nên bạn không mất ngày nào.',
    },
    {
      question: 'Có được hoàn tiền không?',
      answer: 'Wordmet không hoàn tiền tự động. Nếu thanh toán gặp sự cố, gửi email tới support@wordmet.com kèm email tài khoản và mã chuyển khoản.',
    },
    {
      question: 'AI có chấm bài của tôi không?',
      answer: 'Không. AI chỉ soạn câu luyện. Đáp án được chấm theo quy tắc cố định, nên cùng một câu trả lời luôn có cùng kết quả.',
    },
  ],
  source: 'fallback',
};
