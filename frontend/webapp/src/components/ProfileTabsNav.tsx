import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ticket,
  Heart,
  History,
  CreditCard,
  Smartphone,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import i18n from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface ProfileTabsNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  t: (key: string) => string;
}

const tabList = [
  {
    value: "bookings",
    labelKey: "profilepage.profileTabs.bookings",
    icon: Ticket,
  },
  {
    value: "favorites",
    labelKey: "profilepage.profileTabs.favorites",
    icon: Heart,
  },
  {
    value: "dependants",
    labelKey: "profilepage.profileTabs.dependants",
    icon: Users,
  },
  {
    value: "visits",
    labelKey: "profilepage.profileTabs.visits",
    icon: History,
  },
  {
    value: "billing",
    labelKey: "profilepage.profileTabs.billing",
    icon: CreditCard,
  },
  {
    value: "nfc",
    labelKey: "profilepage.profileTabs.nfc",
    icon: Smartphone,
  },
  {
    value: "settings",
    labelKey: "profilepage.profileTabs.settings",
    icon: Settings,
  },
];

export const ProfileTabsNav: React.FC<ProfileTabsNavProps> = ({
  activeTab,
  setActiveTab,
  t,
}) => {
  const isRTL = i18n.language && i18n.language.startsWith("ar");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  // Check scroll position to show/hide indicators
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftIndicator(scrollLeft > 0);
      setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Scroll handlers
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: "smooth" });
    }
  };

  // Check scroll position on mount and when tabs change
  useEffect(() => {
    checkScrollPosition();
    const handleResize = () => checkScrollPosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  // Add scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", checkScrollPosition);
      return () =>
        scrollContainer.removeEventListener("scroll", checkScrollPosition);
    }
  }, []);

  return (
    <div className="relative w-full">
      {/* Left scroll indicator */}
      {showLeftIndicator && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-gradient-to-r from-background to-transparent hover:from-background/80"
          onClick={isRTL ? scrollRight : scrollLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Right scroll indicator */}
      {showRightIndicator && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-gradient-to-l from-background to-transparent hover:from-background/80"
          onClick={isRTL ? scrollLeft : scrollRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Scrollable tabs container */}
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
        dir={isRTL ? "rtl" : undefined}
      >
        <TabsList className="flex flex-nowrap gap-2 px-2 py-1 min-w-max">
          {tabList.map(({ value, labelKey, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1 whitespace-nowrap shrink-0 px-3 py-2 text-sm md:justify-center"
              onClick={() => setActiveTab(value)}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Gradient fade indicators */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
};
