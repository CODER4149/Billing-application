import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export function SlidePanel({ open, onClose, title, description, children, footer, size = "md" }: SlidePanelProps) {
  const isMobile = useIsMobile();
  useBodyScrollLock(open);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "relative ml-auto flex h-full w-full min-h-0 flex-col bg-[var(--color-card)] shadow-2xl",
              !isMobile && sizeClass[size],
              isMobile && "mt-auto max-h-[92dvh] rounded-t-2xl"
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && (
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-[var(--color-accent)] transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-card)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface CenterModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function CenterModal({ open, onClose, title, children, footer, size = "md" }: CenterModalProps) {
  const isMobile = useIsMobile();
  const modalSize = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  useBodyScrollLock(open);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: isMobile ? "100%" : 24, scale: isMobile ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobile ? "100%" : 24, scale: isMobile ? 1 : 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "relative flex w-full min-h-0 flex-col bg-[var(--color-card)] shadow-2xl",
              "max-h-[min(92dvh,100%)] sm:max-h-[min(90vh,100%)]",
              isMobile ? "rounded-t-2xl" : "rounded-2xl glass",
              modalSize[size]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--color-accent)]" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-card)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
