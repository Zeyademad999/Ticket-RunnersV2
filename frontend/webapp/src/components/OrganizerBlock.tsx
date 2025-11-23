// components/OrganizerBlock.tsx
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EventMetricsCard from "./EventsMetricsCard";
import { Organizer } from "../pages/Index";

export default function OrganizerBlock({ org }: { org: Organizer }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  /* helper to scroll the track */
  const scrollBy = (dir: "left" | "right") => {
    const node = trackRef.current;
    if (!node) return;
    const snapWidth = node.firstElementChild?.clientWidth || 300; // fallback
    node.scrollBy({
      left: dir === "left" ? -snapWidth : snapWidth,
      behavior: "smooth",
    });
  };

  return (
    <section className="bg-background border border-border rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Organizer Header */}
      <header className="flex items-center gap-5">
        {org.logoUrl && (
          <img
            src={org.logoUrl}
            alt={org.name}
            className="h-16 w-16 rounded-xl object-cover border border-border"
          />
        )}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{org.name}</h2>
          <p className="text-sm text-muted-foreground">{org.bio}</p>
        </div>
      </header>

      {/* Carousel */}
      {/* Carousel */}
      <div className="relative">
        {/* ⇢ track */}
        <div
          ref={trackRef}
          className="
      flex gap-4
      overflow-x-auto
      snap-x snap-mandatory
      scroll-smooth
      pb-2
      pl-16 pr-16   /* ⬅ makes 4 rem of “empty gutter” left & right */
      [-webkit-overflow-scrolling:touch]
    "
        >
          {org.events.map((e) => (
            <div
              key={e.id}
              className="snap-start shrink-0 w-[280px] md:w-[320px]"
            >
              <EventMetricsCard e={e} />
            </div>
          ))}
        </div>

        {/* ⇠ arrows now sit in the 4rem gutter, not on top of cards */}
        {org.events.length > 2 && (
          <>
            <button
              onClick={() => scrollBy("left")}
              className="
          hidden lg:flex items-center justify-center
          absolute left-4 top-1/2 -translate-y-1/2   /* inside gutter */
          h-9 w-9 rounded-full bg-card/70 border border-border
          text-foreground hover:bg-card backdrop-blur
        "
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollBy("right")}
              className="
          hidden lg:flex items-center justify-center
          absolute right-4 top-1/2 -translate-y-1/2  /* inside gutter */
          h-9 w-9 rounded-full bg-card/70 border border-border
          text-foreground hover:bg-card backdrop-blur
        "
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
