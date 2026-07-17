import { Truck, ShieldCheck, RefreshCw, Leaf, type LucideIcon } from 'lucide-react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Section } from '@/components/common/section';
import { Container } from '@/components/layout/container';
import type { HomeSection } from '@/services/sdk/cms';
import { MotionReveal, MotionItem } from './motion-reveal';

const iconMap: Record<string, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  refresh: RefreshCw,
  leaf: Leaf,
};

function AnimatedCounter({ value, suffix }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, motionValue, value]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current)
        ref.current.textContent = `${Math.round(latest)}${suffix ? ` ${suffix}` : ''}`;
    });
  }, [spring, suffix]);

  return (
    <span ref={ref} className="font-display text-foreground text-3xl">
      0{suffix ? ` ${suffix}` : ''}
    </span>
  );
}

export interface TrustFeaturesSectionProps {
  section?: HomeSection;
}

export function TrustFeaturesSection({ section }: TrustFeaturesSectionProps) {
  const configFeatures = section?.config?.features as
    Array<{ label: string; value?: number; suffix?: string; icon?: string }> | undefined;

  if (!configFeatures?.length) return null;

  return (
    <Section
      spacing="default"
      eyebrow={(section?.config?.eyebrow as string) ?? undefined}
      title={section?.title ?? 'Trust & quality'}
      description={(section?.config?.description as string) ?? undefined}
    >
      <Container>
        <MotionReveal stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {configFeatures.map((feature) => {
            const Icon = iconMap[feature.icon ?? ''] ?? Truck;
            return (
              <MotionItem key={feature.label}>
                <motion.div
                  className="border-border/70 bg-card/90 rounded-[1.5rem] border p-6 shadow-[var(--shadow-soft)]"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-foreground text-background mb-4 flex size-11 items-center justify-center rounded-2xl">
                    <Icon className="size-5" />
                  </div>
                  {typeof feature.value === 'number' ? (
                    <AnimatedCounter value={feature.value} suffix={feature.suffix} />
                  ) : null}
                  <p className="text-muted-foreground mt-2 text-sm">{feature.label}</p>
                </motion.div>
              </MotionItem>
            );
          })}
        </MotionReveal>
      </Container>
    </Section>
  );
}
