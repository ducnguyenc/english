import { useState } from 'react'

function isUrlLike(s: string): boolean {
  return /^(https?:|data:)/i.test(s)
}

/** Nhận emoji / URL / base64 và tự chọn cách render, có fallback nếu ảnh lỗi. */
export default function WordImage({ image, className = '' }: { image?: string; className?: string }) {
  const [errored, setErrored] = useState(false)

  if (!image || (isUrlLike(image) && errored)) {
    return <span className={`inline-flex items-center justify-center text-4xl ${className}`}>🖼️</span>
  }

  if (isUrlLike(image)) {
    return (
      <img
        src={image}
        alt=""
        onError={() => setErrored(true)}
        className={`object-cover rounded-lg ${className}`}
      />
    )
  }

  // emoji hoặc text ngắn
  return <span className={`inline-flex items-center justify-center text-4xl ${className}`}>{image}</span>
}
