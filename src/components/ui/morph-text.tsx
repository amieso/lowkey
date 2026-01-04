'use client'

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MorphTextProps {
  words: string[]
  prefix?: string
  interval?: number
  className?: string
  staggerDelay?: number
}

const charVariants = {
  hidden: { opacity: 0, filter: 'blur(2px)' },
  visible: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(2px)' },
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 55,
}

function AnimatedWord({ text, staggerDelay = 0.015 }: { text: string; staggerDelay?: number }) {
  return (
    <>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          variants={charVariants}
          transition={{ ...springTransition, delay: i * staggerDelay }}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </>
  )
}

export function MorphText({ words, prefix, interval = 3000, className = '', staggerDelay = 0.015 }: MorphTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [width, setWidth] = useState<number | 'auto'>('auto')
  const containerRef = useRef<HTMLSpanElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)

  const nextWord = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % words.length)
  }, [words.length])

  useEffect(() => {
    const timer = setInterval(nextWord, interval)
    return () => clearInterval(timer)
  }, [nextWord, interval])

  // Measure width using a hidden element that always shows current word
  useLayoutEffect(() => {
    if (measureRef.current) {
      const newWidth = measureRef.current.offsetWidth
      setWidth(newWidth)
    }
  }, [currentIndex, prefix, words])

  return (
    <span className={`inline-block relative ${className}`}>
      {/* Hidden measure element */}
      <span
        ref={measureRef}
        className="invisible absolute whitespace-nowrap"
        aria-hidden="true"
      >
        {prefix && <span>{prefix} </span>}
        <span>{words[currentIndex]}</span>
      </span>

      {/* Visible animated container */}
      <motion.span
        ref={containerRef}
        animate={{ width }}
        transition={springTransition}
        className="inline-flex whitespace-nowrap items-baseline"
      >
        {prefix && <span>{prefix}&nbsp;</span>}
        <AnimatePresence mode="wait">
          <motion.span
            key={currentIndex}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="inline-block"
          >
            <AnimatedWord text={words[currentIndex]} staggerDelay={staggerDelay} />
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </span>
  )
}
