'use client'
import Image from 'next/image'
import { useState } from 'react'

export default function ImageCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0)

  const prev = () => setIndex((index - 1 + images.length) % images.length)
  const next = () => setIndex((index + 1) % images.length)

  return (
    <div className="relative w-full h-[350px] overflow-hidden rounded-t-xl">
      <Image
        src={images[index]}
        alt="Image carousel"
        width={1200}
        height={600}
        className="object-cover w-full h-full transition-all duration-300"
      />
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 px-2 rounded hover:bg-white text-xl"
      >
        ◀
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 px-2 rounded hover:bg-white text-xl"
      >
        ▶
      </button>
    </div>
  )
}
