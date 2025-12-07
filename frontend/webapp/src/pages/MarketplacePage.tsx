import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MarketplaceTicketCard } from "@/components/MarketplaceTicketCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Filter, X, Plus, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MarketplaceService, MarketplaceListing, MarketplaceListingsParams } from "@/lib/api/services/marketplace";
import { useAuth } from "@/Contexts/AuthContext";
import { ListTicketModal } from "@/components/ListTicketModal";

export default function MarketplacePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [showMyListings, setShowMyListings] = useState(false);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [loadingMyListings, setLoadingMyListings] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<MarketplaceListingsParams>({
    page: 1,
    limit: 20,
    sort_by: 'listed_recent',
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [eventCategoryId, setEventCategoryId] = useState<string>("all");
  const [ticketCategory, setTicketCategory] = useState<string>("all");
  
  // Pagination
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    limit: 20,
    total_pages: 1,
  });

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    categories: [] as Array<{ id: number; name: string }>,
    venues: [] as Array<{ id: number; name: string; city: string }>,
    ticket_categories: [] as string[],
    price_range: { min: 0, max: 0 },
  });

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await MarketplaceService.getFilterOptions();
        if (response.data) {
          setFilterOptions(response.data);
        }
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    };
    loadFilterOptions();
  }, []);

  // Load listings
  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if user is banned
      if (user && user.status === "banned") {
        setError(t("marketplace.bannedUserError", "Your account has been banned. You cannot access the marketplace."));
        setListings([]);
        setLoading(false);
        return;
      }
      
      const params: MarketplaceListingsParams = {
        ...filters,
        search: searchQuery || undefined,
        price_min: priceMin ? parseFloat(priceMin) : undefined,
        price_max: priceMax ? parseFloat(priceMax) : undefined,
        event_category_id: eventCategoryId && eventCategoryId !== "all" ? parseInt(eventCategoryId) : undefined,
        ticket_category: ticketCategory && ticketCategory !== "all" ? ticketCategory : undefined,
      };

      const response = await MarketplaceService.getMarketplaceListings(params);
      
      // handleApiResponse returns response.data, so response is already the data object
      // Backend returns: { results: [...], count: ..., page: ..., limit: ..., total_pages: ... }
      const data = response as any; // Type assertion since handleApiResponse unwraps the response
      if (data && data.results) {
        setListings(data.results);
        setPagination({
          count: data.count || 0,
          page: data.page || 1,
          limit: data.limit || 20,
          total_pages: data.total_pages || 1,
        });
      } else {
        // No results or invalid response
        setListings([]);
        setPagination({
          count: 0,
          page: 1,
          limit: 20,
          total_pages: 1,
        });
      }
    } catch (err: any) {
      setError(err?.message || t("marketplace.loadError", "Failed to load listings"));
      toast({
        title: t("marketplace.error", "Error"),
        description: err?.message || t("marketplace.loadError", "Failed to load listings"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, priceMin, priceMax, eventCategoryId, ticketCategory, toast, t]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Load user's listings
  const loadMyListings = useCallback(async () => {
    if (!user) {
      setMyListings([]);
      return;
    }

    setLoadingMyListings(true);
    try {
      const response = await MarketplaceService.getMyListings();
      // handleApiResponse returns response.data, so response is already the array
      setMyListings(Array.isArray(response) ? response : []);
    } catch (err: any) {
      console.error("Failed to load my listings:", err);
      setMyListings([]);
    } finally {
      setLoadingMyListings(false);
    }
  }, [user]);

  useEffect(() => {
    if (showMyListings && user) {
      loadMyListings();
    }
  }, [showMyListings, user, loadMyListings]);

  // Handle remove listing
  const handleRemoveListing = useCallback(async (listingId: string) => {
    try {
      await MarketplaceService.removeListing(listingId);
      toast({
        title: t("marketplace.success", "Success"),
        description: t("marketplace.listingRemoved", "Listing removed successfully"),
      });
      // Reload listings
      if (showMyListings) {
        loadMyListings();
      } else {
        loadListings();
      }
    } catch (err: any) {
      toast({
        title: t("marketplace.error", "Error"),
        description: err?.response?.data?.error?.message || err?.message || t("marketplace.removeError", "Failed to remove listing"),
        variant: "destructive",
      });
    }
  }, [showMyListings, loadMyListings, loadListings, toast, t]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    loadListings();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setPriceMin("");
    setPriceMax("");
    setEventCategoryId("all");
    setTicketCategory("all");
    setFilters({
      page: 1,
      limit: 20,
      sort_by: 'listed_recent',
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleListSuccess = () => {
    setShowListModal(false);
    loadListings();
    toast({
      title: t("marketplace.listedSuccess", "Success"),
      description: t("marketplace.ticketListed", "Your ticket has been listed on the marketplace"),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {t("marketplace.title", "Ticket Marketplace")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("marketplace.subtitle", "Buy and sell tickets from other users")}
          </p>
        </div>

        {/* Action Bar */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {user ? (
              <>
                <Button
                  onClick={() => setShowListModal(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("marketplace.listTicket", "List Your Ticket")}
                </Button>
                <Button
                  onClick={() => {
                    setShowMyListings(!showMyListings);
                    if (!showMyListings) {
                      loadMyListings();
                    }
                  }}
                  variant={showMyListings ? "default" : "outline"}
                  className="w-full sm:w-auto"
                >
                  <List className="mr-2 h-4 w-4" />
                  {t("marketplace.myListings", "My Listings")}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  // Show sign-in prompt for non-authenticated users
                  toast({
                    title: t("marketplace.signInRequired", "Sign In Required"),
                    description: t("marketplace.signInToList", "Please sign in to list your tickets on the marketplace"),
                    variant: "default",
                  });
                }}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("marketplace.listTicket", "List Your Ticket")}
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select
              value={filters.sort_by}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, sort_by: value as any, page: 1 }))
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t("marketplace.sortBy", "Sort by")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listed_recent">
                  {t("marketplace.sort.recent", "Recently Listed")}
                </SelectItem>
                <SelectItem value="price_asc">
                  {t("marketplace.sort.priceAsc", "Price: Low to High")}
                </SelectItem>
                <SelectItem value="price_desc">
                  {t("marketplace.sort.priceDesc", "Price: High to Low")}
                </SelectItem>
                <SelectItem value="date_asc">
                  {t("marketplace.sort.dateAsc", "Event Date: Soonest")}
                </SelectItem>
                <SelectItem value="date_desc">
                  {t("marketplace.sort.dateDesc", "Event Date: Latest")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* My Listings View */}
        {showMyListings && user && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">
                {t("marketplace.myListings", "My Listings")}
              </h2>
              <Button
                variant="outline"
                onClick={() => setShowMyListings(false)}
              >
                {t("marketplace.viewAllListings", "View All Listings")}
              </Button>
            </div>
            {loadingMyListings ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : myListings.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <p className="text-muted-foreground">
                  {t("marketplace.noMyListings", "You haven't listed any tickets yet.")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myListings.map((listing, i) => (
                  <div
                    key={listing.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <MarketplaceTicketCard 
                      listing={listing} 
                      onRemove={handleRemoveListing}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters - Hide when showing my listings */}
        {!showMyListings && (
        <div className="mb-8 p-6 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              {t("marketplace.filters", "Filters")}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="ml-auto"
            >
              <X className="h-4 w-4 mr-2" />
              {t("marketplace.clearFilters", "Clear")}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("marketplace.searchPlaceholder", "Search events...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Event Category */}
            <Select
              value={eventCategoryId}
              onValueChange={setEventCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("marketplace.eventCategory", "Event Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("marketplace.allCategories", "All Categories")}</SelectItem>
                {filterOptions.categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Ticket Category */}
            <Select
              value={ticketCategory}
              onValueChange={setTicketCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("marketplace.ticketCategory", "Ticket Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("marketplace.allTicketCategories", "All Ticket Categories")}</SelectItem>
                {filterOptions.ticket_categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Price Min */}
            <Input
              type="number"
              placeholder={t("marketplace.minPrice", "Min Price")}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />

            {/* Price Max */}
            <Input
              type="number"
              placeholder={t("marketplace.maxPrice", "Max Price")}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSearch}
            className="mt-4 w-full sm:w-auto"
          >
            <Search className="h-4 w-4 mr-2" />
            {t("marketplace.search", "Search")}
          </Button>
        </div>
        )}

        {/* Loading State - Hide when showing my listings */}
        {!showMyListings && loading && listings.length === 0 && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">{t("common.loading", "Loading...")}</p>
          </div>
        )}

        {/* Error State - Hide when showing my listings */}
        {!showMyListings && error && (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <Button onClick={loadListings} className="mt-4">
              {t("common.retry", "Retry")}
            </Button>
          </div>
        )}

        {/* Listings Grid - Hide when showing my listings */}
        {!showMyListings && !loading && listings.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {listings.map((listing, i) => (
                <div
                  key={listing.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <MarketplaceTicketCard 
                    listing={listing} 
                    onRemove={user ? handleRemoveListing : undefined}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  {t("common.previous", "Previous")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("common.page", "Page")} {pagination.page} {t("common.of", "of")} {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                >
                  {t("common.next", "Next")}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Empty State - Hide when showing my listings */}
        {!showMyListings && !loading && listings.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {t("marketplace.noListings", "No listings found")}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              {t("marketplace.tryDifferentFilters", "Try adjusting your filters or check back later")}
            </p>
          </div>
        )}
      </main>

      {/* List Ticket Modal - Only show if user is authenticated */}
      {showListModal && user && (
        <ListTicketModal
          open={showListModal}
          onClose={() => setShowListModal(false)}
          onSuccess={handleListSuccess}
        />
      )}
    </div>
  );
}

