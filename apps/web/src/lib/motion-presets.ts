import type { Transition } from 'motion/react';

const baseTransition: Transition = { duration: 0.18, ease: 'easeOut' };

export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: baseTransition,
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: baseTransition,
};

export function staggered(index: number, step = 0.04) {
  return {
    ...fadeInUp,
    transition: { ...baseTransition, delay: index * step },
  };
}

export const drawerSpring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};
