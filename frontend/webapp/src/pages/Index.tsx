import { useReducer, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/HeroSection";
import { EventSection } from "@/components/EventSection";
import { FilteredEvent } from "@/lib/api/types";
import { EventsService } from "@/lib/api/services/events";
import { TrendingUp, Calendar, Mail, Info, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import "keen-slider/keen-slider.min.css";

// Remove mock data - will use API instead

/* -------------------------------------------------------------------------- */
/*                                Types & State                               */
/* -------------------------------------------------------------------------- */

type Filters = {
  category: string;
  location: string;
  tags: string[];
};

interface State {
  filters: Filters;
  showTrendingOnly: boolean;
}

// Actions the reducer can handle
// "SHOW_ALL" is included for future extensibility
// in case you add a button to reset filters
// ------------------------------------------------

type Action =
  | { type: "SET_FILTERS"; payload: Filters }
  | { type: "SHOW_TRENDING" }
  | { type: "SHOW_ALL" };

const initialState: State = {
  filters: { category: "All", location: "All", tags: [] },
  showTrendingOnly: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_FILTERS":
      return { ...state, filters: action.payload, showTrendingOnly: false };
    case "SHOW_TRENDING":
      return { ...state, showTrendingOnly: true };
    case "SHOW_ALL":
      return { ...state, showTrendingOnly: false };
    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Component                                */
/* -------------------------------------------------------------------------- */

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [, dispatch] = useReducer(reducer, initialState);
  const { t } = useTranslation();

  // Fetch home page sections from API
  const [sections, setSections] = useState<Array<{
    section_key: string;
    title: string;
    subtitle: string;
    events: Array<{
      id: number | string;
      title: string;
      date?: string;
      time?: string;
      location?: string;
      venue_name?: string;
      thumbnail_path?: string;
      image_url?: string;
      category_name?: string;
      category?: string;
      starting_price?: number | string;
      price?: number;
    }>;
    order: number;
  }>>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [featuredEvent, setFeaturedEvent] = useState<FilteredEvent | null>(null);
  const [featuredEvents, setFeaturedEvents] = useState<Array<{
    id: string;
    title: string;
    date: string;
    image: string;
    venue: string;
    organizer: string;
    bookNowLink?: string;
  }>>([]);

  // Load home page sections on component mount
  useEffect(() => {
    const loadHomePageSections = async () => {
      try {
        setIsLoadingSections(true);
        const sectionsData = await EventsService.getHomePageSections();
        setSections(sectionsData);
        
        // Find featured events from sections
        const featuredSection = sectionsData.find(s => s.section_key === 'featured');
        if (featuredSection && featuredSection.events && featuredSection.events.length > 0) {
          // Map all featured events to the format expected by FeaturedCarousel
          const mappedEvents = featuredSection.events.map((event) => {
            const eventId = typeof event.id === 'string' ? event.id : (event.id?.toString() || "");
            
            // Build image URL
            let imageUrl = "/event-placeholder.jpg";
            if (event.thumbnail_path) {
              if (event.thumbnail_path.startsWith("http")) {
                imageUrl = event.thumbnail_path;
              } else if (event.thumbnail_path.startsWith("/")) {
                imageUrl = event.thumbnail_path;
              } else {
                imageUrl = `/media/${event.thumbnail_path}`;
              }
            } else if (event.image_url) {
              if (event.image_url.startsWith("http")) {
                imageUrl = event.image_url;
              } else if (event.image_url.startsWith("/")) {
                imageUrl = event.image_url;
              } else {
                imageUrl = `/media/${event.image_url}`;
              }
            }
            
            // Format date
            let formattedDate = event.date || "";
            if (formattedDate) {
              try {
                const dateObj = new Date(formattedDate);
                formattedDate = dateObj.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                });
              } catch (e) {
                // Keep original date string if parsing fails
              }
            }
            
            // Get organizer name - handle both object and string formats
            let organizerName = "TBA";
            if (event.organizer) {
              if (typeof event.organizer === 'string') {
                organizerName = event.organizer;
              } else if (event.organizer.name) {
                organizerName = event.organizer.name;
              }
            } else if (event.organizer_name) {
              organizerName = event.organizer_name;
            }
            
            return {
              id: eventId,
              title: event.title || "Untitled Event",
              date: formattedDate,
              image: imageUrl,
              venue: event.location || event.venue_name || "TBA",
              organizer: organizerName,
              bookNowLink: `/booking/${eventId}`,
            };
          });
          
          setFeaturedEvents(mappedEvents);
          
          // Set first featured event for backward compatibility
          const featured = featuredSection.events[0];
          const eventId = typeof featured.id === 'string' ? parseInt(featured.id, 10) : (featured.id || 0);
          setFeaturedEvent({
            id: eventId,
            title: featured.title || "",
            event_date: featured.date || "",
            event_time: featured.time || "",
            event_location: featured.location || featured.venue_name || "",
            thumbnail_id: 0,
            category_id: 0,
            featured: true,
            thumbnail_path: featured.thumbnail_path || featured.image_url || "/event-placeholder.jpg",
            category_name: featured.category_name || featured.category || "General",
            starting_price: featured.starting_price ? (typeof featured.starting_price === 'string' ? featured.starting_price : featured.starting_price.toString()) : (featured.price?.toString() || "0"),
          });
        } else {
          // If no featured events, try to fetch from featured events endpoint
          try {
            const featuredEventsData = await EventsService.getFeaturedEvents();
            if (featuredEventsData && featuredEventsData.length > 0) {
              const mappedEvents = featuredEventsData.map((event) => {
                const eventId = typeof event.id === 'string' ? event.id : (event.id?.toString() || "");
                
                let imageUrl = "/event-placeholder.jpg";
                if (event.thumbnail_path) {
                  if (event.thumbnail_path.startsWith("http")) {
                    imageUrl = event.thumbnail_path;
                  } else if (event.thumbnail_path.startsWith("/")) {
                    imageUrl = event.thumbnail_path;
                  } else {
                    imageUrl = `/media/${event.thumbnail_path}`;
                  }
                } else if (event.image_url) {
                  if (event.image_url.startsWith("http")) {
                    imageUrl = event.image_url;
                  } else if (event.image_url.startsWith("/")) {
                    imageUrl = event.image_url;
                  } else {
                    imageUrl = `/media/${event.image_url}`;
                  }
                }
                
                let formattedDate = event.date || "";
                if (formattedDate) {
                  try {
                    const dateObj = new Date(formattedDate);
                    formattedDate = dateObj.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                  } catch (e) {
                    // Keep original date string if parsing fails
                  }
                }
                
                // Get organizer name - handle both object and string formats
                let organizerName = "TBA";
                if (event.organizer) {
                  if (typeof event.organizer === 'string') {
                    organizerName = event.organizer;
                  } else if (event.organizer.name) {
                    organizerName = event.organizer.name;
                  }
                } else if (event.organizer_name) {
                  organizerName = event.organizer_name;
                }
                
                return {
                  id: eventId,
                  title: event.title || "Untitled Event",
                  date: formattedDate,
                  image: imageUrl,
                  venue: event.location || event.venue_name || "TBA",
                  organizer: organizerName,
                  bookNowLink: `/booking/${eventId}`,
                };
              });
              setFeaturedEvents(mappedEvents);
            }
          } catch (err) {
            console.error("Failed to load featured events:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load home page sections:", err);
        toast({
          title: "Error",
          description: "Failed to load home page sections. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSections(false);
      }
    };

    loadHomePageSections();
  }, [toast]);

  // Convert section events to component format
  const convertEventsToComponentFormat = (events: any[]) => {
    return events.map((event) => {
      // Get image URL - backend now returns full URLs in thumbnail_path
      let imageUrl = "/event-placeholder.jpg";
      
      if (event.thumbnail_path) {
        // Backend returns full URL (http://localhost:8000/media/...)
        imageUrl = event.thumbnail_path;
      } else if (event.image_url) {
        imageUrl = event.image_url;
      } else if (event.image) {
        // If it's a relative path, make it absolute
        if (event.image.startsWith("http")) {
          imageUrl = event.image;
        } else if (event.image.startsWith("/")) {
          imageUrl = event.image;
        } else {
          imageUrl = `/media/${event.image}`;
        }
      }
      
      return {
        id: event.id?.toString() || "",
        title: event.title || "Untitled Event",
        image: imageUrl,
        date: event.date || event.event_date || "",
        time: event.time || event.event_time || "",
        location: event.location || event.event_location || event.venue_name || "",
        price: event.starting_price ? parseFloat(event.starting_price.toString()) : (event.price || 0),
        category: event.category_name || event.category || "General",
        isFeatured: event.featured || false,
      };
    });
  };

  /* -------------------------- Event Handlers (memo) ------------------------ */

  const handleNavigation = useCallback(
    (page: string) => {
      navigate(`/${page.toLowerCase().replace(" ", "")}`);
    },
    [navigate]
  );

  const handleShowTrending = useCallback(() => {
    dispatch({ type: "SHOW_TRENDING" });
  }, []);

  // handleFilterChange is available for future use with EventFilters component
  // const handleFilterChange = useCallback((filters: Filters) => {
  //   dispatch({ type: "SET_FILTERS", payload: filters });
  // }, []);

  /* -------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main>
        {/* Hero Section */}
        <HeroSection
          featuredEvent={
            featuredEvent
              ? {
                  id: featuredEvent.id.toString(),
                  title: featuredEvent.title,
                  date: featuredEvent.event_date,
                  venue: featuredEvent.event_location,
                  image: featuredEvent.thumbnail_path,
                }
              : null
          }
          featuredEvents={featuredEvents}
          onShowTrending={handleShowTrending}
        />
        {/* Render sections from API */}
        {isLoadingSections ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">{t("loading")}</div>
          </div>
        ) : (
          sections
            .sort((a, b) => a.order - b.order)
            .map((section) => {
              const sectionEvents = convertEventsToComponentFormat(section.events || []);
              if (sectionEvents.length === 0) return null;

              // Map section keys to icons
              const iconMap: Record<string, any> = {
                trending: TrendingUp,
                upcoming: Calendar,
                recommended: Sparkles,
                featured: Sparkles,
              };
              const Icon = iconMap[section.section_key] || TrendingUp;

              return (
                <div key={section.section_key} id={`${section.section_key}-section`}>
                  <EventSection
                    title={section.title}
                    subtitle={section.subtitle}
                    icon={Icon}
                    events={sectionEvents}
                  />
                </div>
              );
            })
        )}

        {/* CTA Section */}
        <section className="py-20 bg-gradient-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
                {t("ctaTitle")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                {t("ctaDescription")}
              </p>
              <Button
                variant="gradient"
                size="hero"
                onClick={() => handleNavigation("contact")}
                className="group mx-2"
              >
                <Mail className="h-5 w-5 ml-2 rtl:ml-0 rtl:mr-2 transition-transform group-hover:scale-110" />
                {t("contactUs")}
              </Button>
              <Button
                variant="outline"
                size="hero"
                onClick={() => handleNavigation("about")}
                className="group mx-2"
              >
                <Info className="h-5 w-5 ml-2 rtl:ml-0 rtl:mr-2 transition-transform group-hover:scale-110" />
                {t("aboutUs")}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// src/types/index.ts
export interface EventMetrics {
  id: string;
  title: string;
  date: string;
  venue: string;
  location: string;
  imageUrl: string;
  giftTicketIds: string[];
  ticketsSold: number;
  ticketsLeft: number;
  completionRate: number;
  netEarnings: number;
  receivedPayouts: number;
  pendingPayouts: number;
  freeTickets: number;
}

export interface Organizer {
  id: string;
  name: string;
  logoUrl: string;
  bio: string;
  events: EventMetrics[];
}

export default Index;
