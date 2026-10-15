// Chrome có bug nổi tiếng: nếu không giữ tham chiếu tới SpeechSynthesisUtterance ở scope ngoài,
// GC có thể dọn nó giữa chừng khiến utterance bị câm lặng (không kêu, không lỗi).
// Giữ ở biến module-level để utterance sống hết vòng đời phát âm.
let activeUtterance: SpeechSynthesisUtterance | null = null
const TTS_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
let activeAudio: HTMLAudioElement | null = null

/**
 * Phát âm: ưu tiên giọng Google Translate TTS (tự nhiên hơn), lỗi (mạng, bị chặn, autoplay...) thì
 * fallback sang Web Speech API như cũ.
 */
export function speak(text: string, lang: 'en-US' | 'vi-VN' = 'en-US'): boolean {
  if (typeof window === 'undefined' || !text.trim()) return false
  // Google TTS giới hạn ~200 ký tự mỗi request — câu dài thì dùng Web Speech luôn.
  if (text.length > 200 || typeof Audio === 'undefined') return speakWebSpeech(text, lang)

  stopAll()
  // Đi qua proxy server (/api/tts) — gọi thẳng Google từ trình duyệt bị chặn vì header Referer.
  const url = `${TTS_BASE_URL}/api/tts?tl=${lang.slice(0, 2)}&q=${encodeURIComponent(text)}`
  const audio = new Audio(url)
  activeAudio = audio
  let fellBack = false
  const fallback = () => {
    if (fellBack || activeAudio !== audio) return // đã fallback, hoặc đã có lần bấm loa mới hơn
    fellBack = true
    activeAudio = null
    speakWebSpeech(text, lang)
  }
  audio.addEventListener('error', fallback)
  audio.play().catch(fallback)
  return true
}

function stopAll() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio = null
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

/** Phát âm bằng Web Speech API — không cần file audio. */
function speakWebSpeech(text: string, lang: 'en-US' | 'vi-VN'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const match = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)))
    if (match) utter.voice = match
    else if (lang === 'vi-VN') return false // không có giọng vi-VN -> để caller fallback

    activeUtterance = utter
    window.speechSynthesis.cancel()
    // Chrome/Edge có bug: speak() gọi ngay sau cancel() trong cùng tick đôi khi bị nuốt câm lặng.
    // Đẩy speak() ra tick sau để tránh race condition này.
    setTimeout(() => {
      if (activeUtterance === utter) window.speechSynthesis.speak(utter)
    }, 50)
    return true
  } catch {
    return false
  }
}

export function hasVoice(lang: 'en-US' | 'vi-VN'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  const voices = window.speechSynthesis.getVoices()
  return voices.some((v) => v.lang === lang || v.lang.startsWith(lang.slice(0, 2)))
}
