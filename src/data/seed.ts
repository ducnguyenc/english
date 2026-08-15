import type { ContentItem } from '../types'

/**
 * Dữ liệu MẪU — chỉ để làm khung/template. Bạn tự thêm nội dung thật qua trang /admin,
 * hoặc sửa trực tiếp file này (điền theo đúng shape của Word / Pattern trong src/types.ts).
 *
 * Ghi chú field `image`: nhận emoji ("🙏"), URL ảnh, hoặc data URI base64 — component
 * WordImage tự nhận diện và có fallback nếu ảnh lỗi.
 */
export const SEED_ITEMS: ContentItem[] = [
  {
    id: 'w-grateful',
    kind: 'word',
    english: 'grateful',
    ipa: '/ˈɡreɪtfəl/',
    vietnamese: 'biết ơn; cảm kích',
    type: 'adj',
    example: "I'm grateful for your help.",
    exampleVi: 'Tôi biết ơn sự giúp đỡ của bạn.',
    image: '🙏',
    note: 'grateful TO + người, FOR + việc',
    collocations: ['grateful for', 'feel grateful'],
    topic: 'Emotions',
  },
  {
    id: 'w-journey',
    kind: 'word',
    english: 'journey',
    ipa: '/ˈdʒɜːni/',
    vietnamese: 'chuyến đi; hành trình',
    type: 'noun',
    example: 'How was your journey?',
    exampleVi: 'Chuyến đi của bạn thế nào?',
    image: '🧳',
    topic: 'Travel',
  },
  {
    id: 'w-postpone',
    kind: 'word',
    english: 'postpone',
    ipa: '/pəˈspoʊn/',
    vietnamese: 'trì hoãn; dời lại',
    type: 'verb',
    example: 'We had to postpone the meeting.',
    exampleVi: 'Chúng tôi phải dời lại cuộc họp.',
    image: '⏳',
    note: 'postpone something TO/UNTIL + thời gian',
    topic: 'Work',
  },
  {
    id: 'p-would-like',
    kind: 'pattern',
    formula: "S + would like + to V",
    meaningVi: 'ai đó muốn làm gì (lịch sự hơn "want")',
    examples: [
      { en: "I'd like to order a coffee, please.", vi: 'Tôi muốn gọi một cốc cà phê.' },
      { en: 'Would you like to join us?', vi: 'Bạn có muốn tham gia cùng chúng tôi không?' },
    ],
    image: '☕',
    topic: 'Ordering',
  },
  {
    id: 'p-how-do-i-get-to',
    kind: 'pattern',
    formula: 'How do I get to + place?',
    meaningVi: 'hỏi đường đến một nơi nào đó',
    examples: [
      { en: 'How do I get to the train station?', vi: 'Tôi đến ga tàu như thế nào?' },
      { en: 'How do I get to your office from here?', vi: 'Tôi đến văn phòng bạn từ đây thế nào?' },
    ],
    image: '🗺️',
    topic: 'Directions',
  },
]
