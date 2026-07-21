import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import bottomBanner from '@/assets/images/Crousel Image/bottombanner.webp';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/media/image';
import { MotionReveal } from './motion-reveal';

export function BottomBannerSection() {
  return (
    <section aria-label="Summer vibes" className="w-full py-0">
      <MotionReveal>
        <div className="relative h-[48vh] max-h-[32rem] min-h-[18rem] w-full overflow-hidden sm:h-[52vh] lg:h-[55vh] lg:max-h-[36rem]">
          <Image
            src={bottomBanner}
            alt="Summer vibes — shop women's collection"
            className="absolute inset-0 h-full w-full object-cover object-top"
            containerClassName="absolute inset-0"
          />

          <Container className="relative flex h-full items-start pt-6 sm:pt-8 lg:pt-10">
            <Button
              asChild
              size="lg"
              className="bg-red-600 px-8 text-white shadow-sm hover:bg-red-700 hover:text-white"
            >
              <Link to="/categories/$slug" params={{ slug: 'women' }} preload="intent">
                Shop now
                <ArrowRight />
              </Link>
            </Button>
          </Container>
        </div>
      </MotionReveal>
    </section>
  );
}
