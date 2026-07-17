import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';
import { scaleVariants } from '@/components/animations/motion-presets';

export interface ScaleProps extends HTMLMotionProps<'div'> {
  delay?: number;
}

export function Scale({ delay = 0, transition, children, ...props }: ScaleProps) {
  return (
    <motion.div
      variants={scaleVariants}
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
