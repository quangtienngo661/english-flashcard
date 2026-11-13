import type { LandingData } from './landing-data';

/**
 * What the home page shows when `next build` could not read the API (M8.3): the seeded prices (design §10.6) and the six FAQ items
 * the migrations seed, verbatim (M8.1, replaced by UI copy round 2 in 20261114180000_landing_faq_copy). Keep both copies equal.
 */
export const FALLBACK_LANDING_DATA: LandingData = {
  prices: { '1': 79000, '3': 199000, '12': 599000 },
  faq: [
    {
      question: 'Wordmet giúp mình học từ vựng thế nào?',
      answer: 'Wordmet lo phần ghi nhớ để bạn dành thời gian dùng từ. Bạn lưu từ mới gặp, Wordmet tra sẵn nghĩa, phiên âm, câu ví dụ và xếp lịch ôn cho từng từ. Mỗi ngày bạn ôn những từ đến hạn và luyện chúng trong câu.',
    },
    {
      question: 'Học rồi vẫn quên, hoặc biết nghĩa mà không dùng được thì sao?',
      answer: 'Wordmet nhắc bạn ôn đúng lúc sắp quên, nhớ rồi thì giãn dần. Khi luyện, bạn điền và gõ từ vào câu chứ không chỉ chọn nghĩa. Những từ hay sai được gom lại để luyện riêng.',
    },
    {
      question: 'Mình nên bắt đầu từ đâu?',
      answer: 'Bắt đầu từ những từ bạn đang gặp khi đọc hay xem phim, hoặc chọn một nhóm từ có sẵn theo chủ đề và trình độ. Sau đó, trang Hôm nay cho biết mỗi ngày cần ôn gì.',
    },
    {
      question: 'AI giúp gì, và có đáng tin không?',
      answer: 'AI viết câu luyện cho từ bạn học và tra nghĩa khi từ điển chưa có. Câu trả lời của bạn được chấm theo đáp án định sẵn, nên kết quả công bằng và nhất quán. Thấy câu nào sai, bạn báo lỗi để đội Wordmet xem lại.',
    },
    {
      question: 'Gói Miễn phí và Pro khác nhau thế nào?',
      answer: 'Gói Miễn phí đủ để học hằng ngày: ghi từ, tra nghĩa, ôn thẻ và luyện tập. Pro dành cho người muốn luyện nhiều hơn, có AI viết câu luyện cho từng từ, tra bằng AI và không quảng cáo.',
    },
    {
      question: 'Nghĩa và câu ví dụ trong Wordmet lấy từ đâu?',
      answer: 'Từ điển của Wordmet dựa trên các bộ dữ liệu có giấy phép mở, và mỗi nghĩa được đội Wordmet duyệt trước khi đến tay người học. Danh sách nguồn có ở trang Nguồn dữ liệu. Nghĩa do AI gợi ý luôn có nhãn riêng để bạn kiểm lại.',
    },
  ],
  source: 'fallback',
};
