"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type QuickAddView =
  | "root"
  | "task"
  | "invoice"
  | "client"
  | "search";

type QuickAddContextValue = {
  isOpen: boolean;
  activeView: QuickAddView;
  openQuickAdd: (view?: QuickAddView) => void;
  closeQuickAdd: () => void;
  setActiveView: (view: QuickAddView) => void;
};

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function QuickAddProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<QuickAddView>("root");

  const openQuickAdd = useCallback((view: QuickAddView = "root") => {
    setActiveView(view);
    setIsOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setIsOpen(false);

    window.setTimeout(() => {
      setActiveView("root");
    }, 150);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommandShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k";

      if (!isCommandShortcut) return;

      event.preventDefault();

      setIsOpen((current) => {
        if (!current) {
          setActiveView("root");
        }

        return !current;
      });
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      activeView,
      openQuickAdd,
      closeQuickAdd,
      setActiveView,
    }),
    [activeView, closeQuickAdd, isOpen, openQuickAdd]
  );

  return (
    <QuickAddContext.Provider value={value}>
      {children}
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const context = useContext(QuickAddContext);

  if (!context) {
    throw new Error("useQuickAdd must be used within QuickAddProvider");
  }

  return context;
}