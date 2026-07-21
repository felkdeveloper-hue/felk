import { motion, useReducedMotion } from 'framer-motion';
import { Image } from '@/components/media/image';
import { EASE_OUT } from '@/components/animations/motion-presets';
import { cn } from '@/lib/utils';

const STACK_IMAGES = [
  { src: '/catalog/women/women-03.jpg', alt: 'Fashion Edge look one', rotate: -9, x: -36 },
  { src: '/catalog/women/women-07.jpg', alt: 'Fashion Edge look two', rotate: 6, x: 28 },
  { src: '/catalog/women/women-12.jpg', alt: 'Fashion Edge look three', rotate: -4, x: -12 },
  { src: '/catalog/women/women-16.jpg', alt: 'Fashion Edge look four', rotate: 8, x: 20 },
] as const;

export function AboutImageStack({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        'relative mx-auto flex h-[30rem] w-full max-w-[22rem] items-start justify-center sm:h-[34rem] sm:max-w-[26rem] lg:h-[38rem] lg:max-w-none',
        className,
      )}
      aria-label="Fashion Edge style stack"
    >
      {STACK_IMAGES.map((item, index) => (
        <motion.div
          key={item.src}
          className="absolute top-6 w-[72%] sm:w-[70%]"
          style={{ zIndex: index + 1 }}
          initial={
            reduceMotion
              ? {
                  opacity: 1,
                  y: index * 48,
                  x: item.x,
                  rotate: item.rotate,
                }
              : {
                  opacity: 0,
                  y: -160 - index * 48,
                  x: item.x * 0.4,
                  rotate: item.rotate * 2.2,
                  scale: 0.9,
                }
          }
          whileInView={{
            opacity: 1,
            y: index * 48,
            x: item.x,
            rotate: item.rotate,
            scale: 1,
          }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{
            duration: 0.9,
            delay: reduceMotion ? 0 : index * 0.16,
            ease: EASE_OUT,
          }}
          whileHover={
            reduceMotion
              ? undefined
              : {
                  y: index * 48 - 14,
                  scale: 1.04,
                  rotate: 0,
                  transition: { duration: 0.28 },
                }
          }
        >
          <div className="border-border/50 bg-card overflow-hidden rounded-2xl border shadow-[0_18px_50px_-20px_rgba(0,0,0,0.55)] ring-1 ring-black/10">
            <Image
              src={item.src}
              alt={item.alt}
              aspectRatio="3/4"
              className="object-cover"
              containerClassName="rounded-none"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
