import type { Transition, Variants } from 'framer-motion';

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const defaultTransition: Transition = {
  duration: 0.45,
  ease: EASE_OUT,
};

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: defaultTransition },
  exit: { opacity: 0, transition: defaultTransition },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: defaultTransition },
  exit: { opacity: 0, y: 18, transition: defaultTransition },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: defaultTransition },
  exit: { opacity: 0, y: -24, transition: defaultTransition },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: defaultTransition },
  exit: { opacity: 0, x: 24, transition: defaultTransition },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: defaultTransition },
  exit: { opacity: 0, x: -24, transition: defaultTransition },
};

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: defaultTransition },
  exit: { opacity: 0, scale: 0.95, transition: defaultTransition },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const pageTransitionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_OUT } },
};
