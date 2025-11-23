import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Phone, ExternalLink, CheckCircle2, Loader2, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MerchantLocationsService, MerchantLocation } from "@/lib/api/services/merchantLocations";
import { Footer } from "@/components/Footer";

export default function NearbyMerchants() {
  const { t, i18n } = useTranslation();
  const [locations, setLocations] = useState<MerchantLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await MerchantLocationsService.getLocations();
        setLocations(data);
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch merchant locations:", err);
        setError(err.message || t("nearby_merchants.fetchError", "Failed to load merchant locations"));
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [t]);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) {
      return locations;
    }
    const query = searchQuery.toLowerCase();
    return locations.filter(
      (location) =>
        location.merchant_name?.toLowerCase().includes(query) ||
        location.address?.toLowerCase().includes(query) ||
        location.phone_number?.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-dark flex flex-col">
      <main className="flex-1 py-8 md:py-20 px-4" dir={i18n.dir()}>
        <div className="container mx-auto max-w-6xl">
          {/* Search Bar and How to Get NFC Card Section - Side by Side on Desktop, Stacked on Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Search Bar - Takes 1 column on mobile, 1 column on desktop */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    {t("nearby_merchants.search", "Search Merchants")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t("nearby_merchants.searchPlaceholder", "Search by name, address, or phone...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {filteredLocations.length} {t("nearby_merchants.resultsFound", "result(s) found")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* How to Get Your NFC Card Section - Takes 1 column on mobile, 2 columns on desktop */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl font-bold text-foreground">
                    {t("nearby_merchants.howToGetCard.title", "How to Get Your NFC Card")}
                  </CardTitle>
                  <CardDescription>
                    {t("nearby_merchants.howToGetCard.description", "Follow these simple steps to receive your NFC card")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-secondary/50 rounded-lg">
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm md:text-base">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base md:text-lg mb-1">
                        {t("nearby_merchants.howToGetCard.step1.title", "Create Your Account")}
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        {t("nearby_merchants.howToGetCard.step1.description", "Make sure you already have an account on Ticket Runners website. If you don't have one, sign up now to get started.")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-secondary/50 rounded-lg">
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm md:text-base">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base md:text-lg mb-1">
                        {t("nearby_merchants.howToGetCard.step2.title", "Visit Nearest Merchant")}
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        {t("nearby_merchants.howToGetCard.step2.description", "Go to the nearest merchant location listed below to receive your NFC card. Make sure to bring a valid ID for verification.")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Merchant Locations Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                {t("nearby_merchants.title", "Nearby Merchants")}
              </CardTitle>
              <CardDescription>
                {t("nearby_merchants.subtitle", "Find the nearest merchant location to collect your NFC card")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-12 text-destructive">
                  <p>{error}</p>
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>
                    {searchQuery
                      ? t("nearby_merchants.noResults", "No merchant locations found matching your search")
                      : t("nearby_merchants.noMerchants", "No merchant locations available at the moment")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLocations.map((location) => (
                    <div
                      key={location.id}
                      className="border rounded-xl p-4 md:p-6 bg-card shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                            <span className="break-words">{location.merchant_name}</span>
                          </h2>
                          <div className="space-y-2 text-muted-foreground">
                            <p className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="break-words">{location.address}</span>
                            </p>
                            {location.phone_number && (
                              <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0" />
                                <a
                                  href={`tel:${location.phone_number}`}
                                  className="text-primary hover:underline break-all"
                                >
                                  {location.phone_number}
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                        {location.google_maps_link && (
                          <a
                            href={location.google_maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline flex-shrink-0 self-start sm:self-center"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              {t("nearby_merchants.viewOnMap", "View on Map")}
                            </span>
                            <span className="sm:hidden">
                              {t("nearby_merchants.map", "Map")}
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
