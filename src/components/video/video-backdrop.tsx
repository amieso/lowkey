'use client'

import { AnimatePresence, motion } from 'framer-motion'

// A single dimmed backdrop shown while a video is expanded. Lives at the grid
// level (not per-card) so navigating between videos never unmounts it — it only
// fades in on open and out on close, avoiding a flicker during the swap.
export function VideoBackdrop({ show, onClose }: { show: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] bg-background/90 backdrop-blur-lg"
        />
      )}
    </AnimatePresence>
  )
}
