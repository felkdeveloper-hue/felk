import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { pageTransitionVariants } from '@/components/animations/motion-presets';

export interface PageTransitionProps {
  children: ReactNode;
  routeKey: string;
}

export function PageTransition({ children, routeKey }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        variants={pageTransitionVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
