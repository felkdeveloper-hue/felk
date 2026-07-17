import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  defaultTransition,
  slideUpVariants,
  staggerContainerVariants,
} from '@/components/animations/motion-presets';
import { cn } from '@/lib/utils';

export interface MotionRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  delay?: number;
}

export function MotionReveal({
  children,
  className,
  stagger = false,
  delay = 0,
}: MotionRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger ? staggerContainerVariants : slideUpVariants}
      transition={{ ...defaultTransition, delay }}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={slideUpVariants}>
      {children}
    </motion.div>
  );
}

export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}
