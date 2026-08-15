/** Phát âm bằng Web Speech API — không cần file audio. */
export function speak(text: string, lang: 'en-US' | 'vi-VN' = 'en-US'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const match = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)))
    if (match) utter.voice = match
    else if (lang === 'vi-VN') return false // không có giọng vi-VN -> để caller fallback
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
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
