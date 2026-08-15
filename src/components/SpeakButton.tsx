import { speak } from '../lib/speech'

export default function SpeakButton({
  text,
  lang = 'en-US',
  className = '',
}: {
  text: string
  lang?: 'en-US' | 'vi-VN'
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        speak(text, lang)
      }}
      aria-label="Phát âm"
      className={`inline-flex items-center justify-center rounded-full w-8 h-8 text-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition ${className}`}
    >
      🔊
    </button>
  )
}
