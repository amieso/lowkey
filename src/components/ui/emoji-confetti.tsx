'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmojiConfettiProps {
  trigger: boolean
  emojis?: string[]
}

const DEFAULT_EMOJIS = ["♟️", "☑️", "💫", "🙌", "💪", "✨", "🚀"]

type ConfettiPiece = {
  id: string
  emoji: string
  x: number
  peakY: number
  endY: number
  rotate: number
  delay: number
}

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min

const buildBurst = (): ConfettiPiece[] =>
  DEFAULT_EMOJIS.map((emoji, i) => ({
    id: `${emoji}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    emoji,
    x: randomBetween(-77, 77),
    peakY: randomBetween(-60, -140),
    endY: -280,
    rotate: randomBetween(-220, 220),
    delay: i * 0.08,
  }))

export function EmojiConfetti({ trigger, emojis = DEFAULT_EMOJIS }: EmojiConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (trigger) {
      setConfetti(buildBurst())
    } else {
      setConfetti([])
    }
  }, [trigger])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.span
            key={piece.id}
            initial={{ opacity: 0, y: 0, x: 0, scale: 0.85, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.85, 1.05, 1, 1],
              x: piece.x,
              y: [0, piece.peakY, piece.peakY, piece.endY],
              rotate: [0, piece.rotate * 0.3, piece.rotate * 0.6, piece.rotate],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 3,
              times: [0, 0.18, 0.35, 1],
              ease: "linear",
              x: {
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: piece.delay,
              },
              y: {
                duration: 3,
                times: [0, 0.18, 0.35, 1],
                ease: [0.33, 1, 0.68, 1],
                delay: piece.delay,
              },
              opacity: {
                duration: 3,
                times: [0, 0.15, 0.4, 0.7],
                ease: "easeOut",
                delay: piece.delay,
              },
              scale: {
                duration: 3,
                times: [0, 0.18, 0.35, 1],
                ease: [0.22, 1, 0.36, 1],
                delay: piece.delay,
              },
              rotate: {
                duration: 3,
                times: [0, 0.18, 0.35, 1],
                ease: "linear",
                delay: piece.delay,
              },
            }}
            className="absolute left-1/2 top-1/2 text-2xl"
          >
            {piece.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}
