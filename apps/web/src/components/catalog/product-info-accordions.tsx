import { List, RefreshCcw } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface ProductInfoAccordionsProps {
  description?: string;
}

export function ProductInfoAccordions({ description }: ProductInfoAccordionsProps) {
  return (
    <Accordion type="multiple" className="rounded-xl border">
      {description ? (
        <AccordionItem value="description" className="border-b px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3 text-left">
              <List className="text-muted-foreground size-5 shrink-0" />
              <div>
                <p className="font-semibold">Product Description</p>
                <p className="text-muted-foreground text-xs font-normal">
                  Manufacture, Care and Fit
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pl-8">
            <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
              {description}
            </div>
          </AccordionContent>
        </AccordionItem>
      ) : null}
      <AccordionItem value="returns" className="px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 text-left">
            <RefreshCcw className="text-muted-foreground size-5 shrink-0" />
            <div>
              <p className="font-semibold">15 Days Returns & Exchange</p>
              <p className="text-muted-foreground text-xs font-normal">
                Know about return & exchange policy
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pl-8">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Return or exchange eligible items within 15 days of delivery. Items must be unused and
            in original packaging. Refunds are processed after quality check.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
