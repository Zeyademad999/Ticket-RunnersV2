import { EventCard } from "./EventCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Calendar, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// Import event images
import event1 from "@/assets/event1.jpg";
import event2 from "@/assets/event2.jpg";
import event3 from "@/assets/event3.jpg";
import event4 from "@/assets/event4.jpg";
import event5 from "@/assets/event5.jpg";
import event6 from "@/assets/event6.jpg";

interface EventSectionProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  events: Array<{
    id: string;
    title: string;
    image: string;
    date: string;
    time: string;
    location: string;
    price: number;
    category: string;
    [key: string]: unknown;
  }>;
  showViewAll?: boolean;
}

export function EventSection({
  title,
  subtitle,
  icon: Icon,
  events,
  showViewAll = true,
}: EventSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleViewAll = () => {
    const sectionMap: { [key: string]: string } = {
      trending: "trending",
      upcoming: "upcoming",
      recommended: "recommended",
    };

    const normalizedTitle = title.toLowerCase().replace(/\s+/g, "_");
    const section = sectionMap[normalizedTitle] || "all";
    navigate(`/events?section=${section}`);
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {t(title)}
              </h2>
              <p className="text-muted-foreground mt-1">{t(subtitle)}</p>
            </div>
          </div>

          {showViewAll && (
            <Button
              variant="outline"
              className="group hidden md:flex"
              onClick={handleViewAll}
            >
              {t("viewAll")}
              <ArrowRight className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <EventCard {...event} category={event.category} />
            </div>
          ))}
        </div>

        {showViewAll && (
          <div className="flex justify-center mt-8 md:hidden">
            <Button variant="outline" className="group" onClick={handleViewAll}>
              {t("viewAll")} {t(title)}
              <ArrowRight className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

// Sample data for different event sections
export const trendingEvents = [
  {
    id: "1",
    title: "Ahmed Sheba Live Concert",
    image: event1,
    date: "March 15, 2025",
    time: "8:00 PM",
    location: "Cairo Opera House",
    price: 150,
    originalPrice: 200,
    category: "music",
    rating: 4.8,
    attendees: 1250,
    isFeatured: true,
  },
  {
    id: "2",
    title: "Ramadan Cultural Festival",
    image: event2,
    date: "March 20, 2025",
    time: "6:00 PM",
    location: "Al-Azhar Park",
    price: 75,
    category: "cultural",
    rating: 4.9,
    attendees: 850,
  },
  {
    id: "3",
    title: "Modern Art Exhibition",
    image: event3,
    date: "March 25, 2025",
    time: "10:00 AM",
    location: "Museum of Modern Art",
    price: 50,
    category: "art",
    rating: 4.7,
    attendees: 420,
  },
];

export const upcomingEvents = [
  {
    id: "4",
    title: "Comedy Night with Ahmed Amin",
    image: event4,
    date: "April 2, 2025",
    time: "9:00 PM",
    location: "Sayed Darwish Theatre",
    price: 100,
    category: "comedy",
    rating: 4.6,
    attendees: 650,
  },
  {
    id: "5",
    title: "Electronic Music Festival",
    image: event5,
    date: "April 10, 2025",
    time: "7:00 PM",
    location: "New Capital",
    price: 250,
    originalPrice: 300,
    category: "edm",
    rating: 4.9,
    attendees: 2000,
    isFeatured: true,
  },
  {
    id: "6",
    title: "Street Food Festival",
    image: event6,
    date: "April 15, 2025",
    time: "4:00 PM",
    location: "Zamalek District",
    price: 30,
    category: "food",
    rating: 4.5,
    attendees: 1100,
  },
];

export const recommendedEvents = [
  {
    id: "7",
    title: "Classical Music Evening",
    image: event1,
    date: "April 20, 2025",
    time: "7:30 PM",
    location: "Cairo Opera House",
    price: 120,
    category: "classical",
    rating: 4.8,
    attendees: 400,
  },
  {
    id: "8",
    title: "Photography Workshop",
    image: event3,
    date: "April 25, 2025",
    time: "10:00 AM",
    location: "Downtown Cairo",
    price: 80,
    category: "workshop",
    rating: 4.7,
    attendees: 150,
  },
  {
    id: "9",
    title: "Jazz Night Under the Stars",
    image: event2,
    date: "May 1, 2025",
    time: "8:00 PM",
    location: "Nile Corniche",
    price: 180,
    category: "jazz",
    rating: 4.9,
    attendees: 300,
  },
];
