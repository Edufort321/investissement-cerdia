'use client'
import { useState } from 'react'

export default function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0)

  const prev = () => setIndex((index - 1 + images.length) % images.length)
  const next = () => setIndex((index + 1) % images.length)

  return (
    <div className="relative w-full h-[350px] overflow-hidden rounded-t-xl bg-gray-900">
      {images.map((src, idx) => (
        <div key={idx} className={`absolute inset-0 transition-opacity duration-500 ${idx === index ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 scale-110" style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(24px) brightness(0.3) saturate(1.2)',
          }} />
          <img src={src} alt="" className="absolute inset-0 w-full h-full object-contain" />
        </div>
      ))}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 px-2 rounded hover:bg-white text-xl z-10"
      >
        ◀
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 px-2 rounded hover:bg-white text-xl z-10"
      >
        ▶
      </button>
    </div>
  )
}
