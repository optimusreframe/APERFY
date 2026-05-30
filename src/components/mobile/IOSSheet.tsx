import { ReactNode } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export interface IOSSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  trigger?: ReactNode;
  children: ReactNode;
  desktopClassName?: string;
  mobileClassName?: string;
}

/**
 * Adaptive modal: shadcn Dialog on desktop, iOS-style bottom sheet on mobile
 * (grabber, drag-to-dismiss, rounded top, safe-area-inset-bottom).
 */
export default function IOSSheet({
  open,
  onOpenChange,
  title,
  trigger,
  children,
  desktopClassName,
  mobileClassName,
}: IOSSheetProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent className={desktopClassName}>
          {title ? (
            <VisuallyHidden asChild>
              <DialogTitle>{title}</DialogTitle>
            </VisuallyHidden>
          ) : null}
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onOpenChange(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => onOpenChange(true)} className="inline-flex">
          {trigger}
        </span>
      ) : null}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
              aria-hidden
            />
            <motion.div
              key="sheet-panel"
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              className={`fixed inset-x-0 bottom-0 z-[81] max-h-[92vh] rounded-t-3xl border-t border-white/10 bg-card/95 backdrop-blur-2xl shadow-[0_-20px_60px_-10px_hsl(0_0%_0%/0.7)] ${
                mobileClassName ?? ""
              }`}
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="pt-2.5 pb-1 flex justify-center">
                <span className="block h-1.5 w-10 rounded-full bg-white/20" />
              </div>
              {title ? (
                <div className="px-5 pb-2">
                  <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {title}
                  </h2>
                </div>
              ) : null}
              <div className="overflow-y-auto overscroll-contain px-5 pb-6 max-h-[calc(92vh-2.5rem)]">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
