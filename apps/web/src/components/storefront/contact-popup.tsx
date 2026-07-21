import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContactForm } from './contact-form';

export interface ContactPopupProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ContactPopup({ open: openProp, onOpenChange }: ContactPopupProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  useEffect(() => {
    if (isControlled) return;
    const frame = requestAnimationFrame(() => setInternalOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [isControlled]);

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send us a message</DialogTitle>
          <DialogDescription>
            Questions about sizing, orders, or collaborations? Drop a note and we&apos;ll get back
            within one business day.
          </DialogDescription>
        </DialogHeader>
        <ContactForm idPrefix="contact-popup" onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
