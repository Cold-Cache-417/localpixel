import { motion, useReducedMotion } from "motion/react"

/** A four-dot pixel mark — the "local pixel" signature. */
export function Wordmark({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <motion.span
        aria-hidden="true"
        className="grid size-[18px] grid-cols-2 gap-[2px]"
        initial={false}
        whileHover={reduce ? undefined : { rotate: 90 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <span className="rounded-[1px] bg-foreground" />
        <span className="rounded-[1px] bg-primary" />
        <span className="rounded-[1px] bg-primary" />
        <span className="rounded-[1px] bg-foreground" />
      </motion.span>
      <span className="font-display text-[16px] font-semibold tracking-[-0.03em]">
        localpixel
      </span>
    </span>
  )
}
