import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  User,
  UserPlus,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Ticket,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/Contexts/AuthContext";
import { AuthModals } from "./AuthModals";
import { LogoutConfirmationDialog } from "@/components/ui/logout-confirmation-dialog";
import AsyncSelect from "react-select/async";
import useClickAway from "react-use/lib/useClickAway";
import { useTheme } from "../hooks/useTheme";
import { normalizeImageUrl } from "@/lib/utils";

export function Header() {
  const { user, openLogin, openSignup, logout, logoutAll } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoggedIn] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  // Reset profile image error when user changes
  useEffect(() => {
    setProfileImageError(false);
  }, [user?.profile_image]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const [language, setLanguage] = useState("EN");
  const searchWrapperRef = useRef(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useClickAway(searchWrapperRef, () => {
    setIsSearchFocused(false);
  });

  // Close mobile menu when clicking outside
  useClickAway(menuRef, () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  });

  const loadOptions = async (
    inputValue: string
  ): Promise<Array<Record<string, unknown>>> => {
    if (!inputValue || inputValue.length < 2) {
      setSearchResults([]);
      setSearchQuery("");
      return [];
    }

    try {
      const { EventsService } = await import("@/lib/api/services/events");
      console.log("Searching for:", inputValue);
      const response = await EventsService.searchEvents(inputValue, 1, 10);

      // Debug the response structure
      console.log("Search API response:", response);
      console.log("Response type:", typeof response);
      console.log(
        "Response keys:",
        response ? Object.keys(response) : "response is null/undefined"
      );

      // Handle different possible response structures
      let events = [];
      if (response && response.events && Array.isArray(response.events)) {
        events = response.events;
        console.log("Using response.events, found", events.length, "events");
      } else if (response && response.data && Array.isArray(response.data)) {
        events = response.data;
        console.log("Using response.data, found", events.length, "events");
      } else if (response && Array.isArray(response)) {
        events = response;
        console.log("Using response as array, found", events.length, "events");
      } else {
        console.warn("Unexpected API response structure:", response);
        console.warn("Response.events:", response?.events);
        console.warn("Response.data:", response?.data);
        setSearchResults([]);
        setSearchQuery("");
        return [];
      }

      if (!Array.isArray(events)) {
        console.warn("Events is not an array:", events);
        setSearchResults([]);
        setSearchQuery("");
        return [];
      }

      // Store results for preview
      console.log("Setting search results:", events.length, "events");
      console.log("Setting search query:", inputValue);
      setSearchResults(events);
      setSearchQuery(inputValue);

      return events.map((event) => ({
        label: event.title || event.name,
        value: event.id,
        image: event.cover_image || event.thumbnail_path || event.image,
        date: event.start_date || event.event_date || event.date,
        location: event.location || event.event_location,
        time: event.start_time || event.event_time || event.time,
      }));
    } catch (error: any) {
      console.error("Search error:", error);
      console.error("Error details:", error?.message);
      setSearchResults([]);
      setSearchQuery("");
      return [];
    }
  };

  const formatOptionLabel = (
    option: Record<string, unknown>
  ): React.ReactNode => (
    <div className="flex gap-2 items-center">
      <img
        src={option.image as string}
        alt={option.label as string}
        className="w-12 h-12 object-cover rounded"
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{option.label as string}</span>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <Calendar className="w-3 h-3" />
          <span>{option.date as string}</span>
          <Clock className="w-3 h-3 ml-2" />
          <span>{option.time as string}</span>
        </div>
        <div className="flex items-center text-xs text-muted-foreground gap-1">
          <MapPin className="w-3 h-3" />
          <span>{option.location as string}</span>
        </div>
      </div>
    </div>
  );

  const handleChange = (selected: Record<string, unknown> | null) => {
    if (selected?.value) {
      console.log("=== ASYNC SELECT CHANGE TRIGGERED ===");
      console.log("Selected value:", selected.value);
      console.log("Selected object:", selected);
      console.log("Navigating to:", `/event/${selected.value}`);

      try {
        navigate(`/event/${selected.value}`);
        console.log("AsyncSelect navigation called successfully");
        setIsSearchFocused(false);
        setSearchResults([]);
        setSearchQuery("");
      } catch (error) {
        console.error("AsyncSelect navigation error:", error);
      }
    }
  };

  useEffect(() => {
    const html = document.documentElement;

    if (isDark) {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }

    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const storedLang = localStorage.getItem("appLanguage");
    if (storedLang) {
      setLanguage(storedLang);
      i18n.changeLanguage(storedLang === "EN" ? "en" : "ar");
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === "EN" ? "ar" : "EN";
    setLanguage(newLang);
    i18n.changeLanguage(newLang === "EN" ? "en" : "ar");
    localStorage.setItem("appLanguage", newLang);

    toast({
      title: t("languageChanged", {
        lang: newLang === "ar" ? t("arabic") : t("english"),
      }),
      description: t("interfaceLanguageUpdated"),
    });
  };

  const handleLogin = () => {
    openLogin();
  };

  const handleRegister = () => {
    openSignup();
  };

  const handleLogout = () => {
    setShowLogoutConfirmation(true);
  };

  const handleConfirmLogout = async () => {
    await logout();
  };

  const handleConfirmLogoutAll = async () => {
    await logoutAll();
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-8 flex-shrink-0">
            <a href="/" className="block">
              {isDark ? (
                <img
                  src="/ticket-logo.png"
                  alt="Ticket Runners Logo"
                  className="h-10 w-auto sm:h-12 md:h-14"
                />
              ) : (
                <img
                  src="/ticket-logo-secondary.png"
                  alt="Ticket Runners Logo"
                  className="h-10 w-auto sm:h-12 md:h-14"
                />
              )}
            </a>
          </div>

          {/* Search (hidden on mobile) */}
          <div
            className="hidden md:flex flex-col flex-1 min-w-0 max-w-lg mx-4 gap-2 relative z-10"
            ref={searchWrapperRef}
          >
            {/* Search Input */}
            <AsyncSelect
              cacheOptions
              loadOptions={loadOptions}
              defaultOptions
              onChange={handleChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              formatOptionLabel={formatOptionLabel}
              placeholder={t("searchEvents")}
              classNamePrefix="react-select"
              isClearable
              isSearchable
              noOptionsMessage={() => t("noSearchResults")}
              loadingMessage={() => t("searching")}
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: "hsl(var(--input))",
                  borderColor: "hsl(var(--border))",
                  color: "var(--search-text)",
                }),
                input: (base) => ({
                  ...base,
                  color: "var(--search-text)",
                }),
                singleValue: (base) => ({
                  ...base,
                  color: "var(--search-text)",
                }),
                placeholder: (base) => ({
                  ...base,
                  color: "var(--search-placeholder)",
                }),
                option: (base, { isFocused }) => ({
                  ...base,
                  backgroundColor: isFocused
                    ? "hsl(var(--muted))"
                    : "transparent",
                  color: "white",
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: "hsl(var(--popover))",
                }),
              }}
            />

            {/* Preview Below Input */}
            {isSearchFocused && searchResults.length > 0 && searchQuery && (
              <div
                className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-lg z-[60] max-h-96 overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    {t("searchResults")} for "{searchQuery}"
                  </h3>
                  <div className="space-y-3">
                    {searchResults.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="flex gap-3 items-start p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors w-full text-left"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("=== CLICK EVENT TRIGGERED ===");
                          console.log("Event object:", event);
                          console.log("Event ID:", event.id);
                          console.log(
                            "Event title:",
                            event.title || event.name
                          );
                          console.log("Navigating to:", `/event/${event.id}`);

                          try {
                            // Use React Router navigate for proper SPA navigation
                            navigate(`/event/${event.id}`);
                            console.log("Navigation called successfully");
                            setIsSearchFocused(false);
                            setSearchResults([]);
                            setSearchQuery("");
                          } catch (error) {
                            console.error("Navigation error:", error);
                          }
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("=== TOUCH EVENT TRIGGERED ===");
                          console.log("Event object:", event);
                          console.log("Event ID:", event.id);
                          console.log("Navigating to:", `/event/${event.id}`);

                          try {
                            navigate(`/event/${event.id}`);
                            console.log("Touch navigation called successfully");
                            setIsSearchFocused(false);
                            setSearchResults([]);
                            setSearchQuery("");
                          } catch (error) {
                            console.error("Touch navigation error:", error);
                          }
                        }}
                      >
                        <img
                          src={
                            event.cover_image ||
                            event.thumbnail_path ||
                            event.image ||
                            "/placeholder.svg"
                          }
                          alt={event.title || event.name}
                          className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {event.title || event.name}
                          </h4>
                          <div className="text-xs text-muted-foreground space-y-1 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {event.start_date ||
                                  event.event_date ||
                                  event.date}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">
                                {event.location || event.event_location}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {searchResults.length > 3 && (
                      <div className="text-center pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          {searchResults.length - 3} more results...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Marketplace Link - Desktop */}
          <div className="hidden md:flex items-center mx-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-auto py-1.5 px-3 hover:bg-muted/50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate("/marketplace");
              }}
            >
              <Ticket className="h-4 w-4 flex-shrink-0" />
              <span className="font-semibold text-sm">
                {t("marketplace.title", "Marketplace")}
              </span>
            </Button>
          </div>

          {/* How to Get NFC Card - Desktop */}
          <div className="hidden md:flex items-center mx-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-left h-auto py-1.5 px-3 max-w-[200px] hover:bg-muted/50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate("/nearby-merchants");
              }}
            >
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="font-semibold text-xs leading-tight truncate w-full">
                  {t("nearby_merchants.howToGetCard.title", "How to Get Your NFC Card")}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight truncate w-full">
                  {t("nearby_merchants.howToGetCard.shortDescription", "Find merchant locations")}
                </span>
              </div>
            </Button>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-x-2 ltr:flex-row rtl:flex-row-reverse">
            <div className="flex items-center gap-2 rtl:flex-row-reverse">
              <Sun className="h-4 w-4" />
              <Switch
                checked={isDark}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-primary"
              />
              <Moon className="h-4 w-4" />
            </div>
            <Button variant="header" size="icon" onClick={toggleLanguage}>
              <span className="text-xs ml-1">{language}</span>
            </Button>
            {!user ? (
              <>
                <Button variant="header" size="icon" onClick={handleRegister}>
                  <UserPlus className="h-4 w-4" />
                </Button>
                <Button variant="header" size="icon" onClick={handleLogin}>
                  <LogIn className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="header" 
                  size="icon" 
                  onClick={handleProfile}
                  className="relative"
                >
                  {user?.profile_image && !profileImageError ? (
                    <img
                      src={normalizeImageUrl(user.profile_image)}
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover"
                      onError={() => {
                        setProfileImageError(true);
                      }}
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="header" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="header"
            size="icon"
            type="button"
            className="md:hidden hover-scale text-muted-foreground hover:text-foreground [&]:bg-secondary/20 hover:[&]:bg-secondary/40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsMenuOpen(!isMenuOpen);
              }
            }}
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div 
            ref={menuRef}
            className="md:hidden py-4 border-t border-border bg-card animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsMenuOpen(false);
              }
            }}
          >
            <div className="space-y-4">
              {/* Mobile Search */}
              <div className="relative px-2">
                <AsyncSelect
                  cacheOptions
                  loadOptions={loadOptions}
                  defaultOptions
                  onChange={handleChange}
                  formatOptionLabel={formatOptionLabel}
                  placeholder={t("searchEvents")}
                  classNamePrefix="react-select"
                  onKeyDown={(e) => {
                    // Prevent menu from closing when typing in search
                    e.stopPropagation();
                  }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      backgroundColor: "hsl(var(--input))",
                      borderColor: "hsl(var(--border))",
                      color: "var(--search-text)",
                    }),
                    input: (base) => ({
                      ...base,
                      color: "var(--search-text)",
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: "var(--search-text)",
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: "hsl(0, 0%, 70%)", // muted placeholder
                    }),
                    option: (base, { isFocused }) => ({
                      ...base,
                      backgroundColor: isFocused
                        ? "hsl(var(--muted))"
                        : "transparent",
                      color: "white",
                    }),
                    menu: (base) => ({
                      ...base,
                      backgroundColor: "hsl(var(--popover))",
                    }),
                  }}
                />
              </div>

              {/* How to Get NFC Card Section */}
              <div className="px-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-start gap-2 text-left h-auto py-3 px-4"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate("/nearby-merchants");
                    setIsMenuOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate("/nearby-merchants");
                      setIsMenuOpen(false);
                    }
                  }}
                >
                  <CreditCard className="h-5 w-5 flex-shrink-0" />
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-semibold text-sm">
                      {t("nearby_merchants.howToGetCard.title", "How to Get Your NFC Card")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("nearby_merchants.howToGetCard.shortDescription", "Find merchant locations")}
                    </span>
                  </div>
                </Button>
              </div>

              {/* Mobile Navigation Bar */}
              <nav className="flex justify-between items-center gap-2 pt-2 border-t border-border px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors [&:hover]:transform-none [&:hover]:translate-y-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate("/");
                    setIsMenuOpen(false);
                  }}
                >
                  <Home className="h-5 w-5 pt-0.5" />
                  <span>{t("home")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors [&:hover]:transform-none [&:hover]:translate-y-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate("/marketplace");
                    setIsMenuOpen(false);
                  }}
                >
                  <Ticket className="h-5 w-5 pt-0.5" />
                  <span>{t("marketplace.title", "Marketplace")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors [&:hover]:transform-none [&:hover]:translate-y-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate("/profile");
                    setIsMenuOpen(false);
                  }}
                >
                  {user?.profile_image && !profileImageError ? (
                    <img
                      src={normalizeImageUrl(user.profile_image)}
                      alt="Profile"
                      className="h-5 w-5 rounded-full object-cover pt-0.5"
                      onError={() => {
                        setProfileImageError(true);
                      }}
                    />
                  ) : (
                    <User className="h-5 w-5 pt-0.5" />
                  )}
                  <span>{t("profile")}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors [&:hover]:transform-none [&:hover]:translate-y-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate("/events");
                    setIsMenuOpen(false);
                  }}
                >
                  <Calendar className="h-5 w-5 pt-0.5" />
                  <span>{(() => {
                    const eventsText = t("events");
                    return typeof eventsText === "string" ? eventsText : "Events";
                  })()}</span>
                </Button>
              </nav>

              {/* Mobile Actions */}
              <div className="flex flex-col space-y-2 mx-2">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Sun className="h-4 w-4" />
                    <Switch
                      checked={isDark}
                      onCheckedChange={toggleTheme}
                      className="data-[state=checked]:bg-primary"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <Moon className="h-4 w-4" />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleLanguage();
                    }}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    {language}
                  </Button>
                </div>
                <div className="flex flex-col space-y-2">
                  {!isLoggedIn ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRegister();
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t("register")}
                      </Button>
                      <Button
                        variant="gradient"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLogin();
                        }}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        {t("login")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProfile();
                        }}
                      >
                        {user?.profile_image && !profileImageError ? (
                          <img
                            src={normalizeImageUrl(user.profile_image)}
                            alt="Profile"
                            className="h-4 w-4 rounded-full object-cover mr-2"
                            onError={() => {
                              setProfileImageError(true);
                            }}
                          />
                        ) : (
                          <User className="h-4 w-4 mr-2" />
                        )}
                        {t("profile")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleLogout();
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t("logout")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AuthModals
        onLoginSuccess={() => {
          /* handle success if needed */
        }}
      />

      <LogoutConfirmationDialog
        open={showLogoutConfirmation}
        onOpenChange={setShowLogoutConfirmation}
        onConfirm={handleConfirmLogout}
        onLogoutAll={handleConfirmLogoutAll}
      />
    </header>
  );
}
