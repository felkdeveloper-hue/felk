import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';
import {
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  slideUpVariants,
} from '@/components/animations/motion-presets';

export interface SlideProps extends HTMLMotionProps<'div'> {
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}

const VARIANTS_BY_DIRECTION = {
  up: slideUpVariants,
  down: slideDownVariants,
  left: slideLeftVariants,
  right: slideRightVariants,
};

export function Slide({ direction = 'up', delay = 0, transition, children, ...props }: SlideProps) {
  return (
    <motion.div
      variants={VARIANTS_BY_DIRECTION[direction]}
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
