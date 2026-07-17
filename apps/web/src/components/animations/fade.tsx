import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';
import { fadeVariants } from '@/components/animations/motion-presets';

export interface FadeProps extends HTMLMotionProps<'div'> {
  delay?: number;
}

export function Fade({ delay = 0, transition, children, ...props }: FadeProps) {
  return (
    <motion.div
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ delay, ...transition }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
