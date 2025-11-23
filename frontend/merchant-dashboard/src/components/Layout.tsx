import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Home,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "./LanguageToggle";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { merchant, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const navigation = [
    { name: t("common.dashboard"), href: "/dashboard", icon: Home },
    { name: t("common.assignCard"), href: "/assign-card", icon: CreditCard },
    { name: t("common.cardInventory"), href: "/inventory", icon: Package },
    { name: t("common.settings"), href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={`fixed inset-y-0 ${
            isRTL ? "right-0" : "left-0"
          } flex w-64 flex-col bg-white shadow-xl`}
        >
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <img
                src="/ticket-logo-secondary.png"
                alt="Ticket Runners Logo"
                className="h-12 w-auto"
              />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link ${
                    isActive(item.href) ? "active" : ""
                  }`}
                >
                  <Icon className={`${isRTL ? "ml-3" : "mr-3"} h-5 w-5`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
              </div>
              <div className={`${isRTL ? "mr-3" : "ml-3"}`}>
                <p className="text-sm font-medium text-gray-700">
                  {merchant?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {merchant?.mobile_number}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <LogOut className={`${isRTL ? "ml-3" : "mr-3"} h-5 w-5`} />
              {t("common.logout")}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col ${
          isRTL ? "lg:right-0" : "lg:left-0"
        }`}
      >
        <div className="flex flex-col flex-grow bg-white shadow-xl">
          <div className="flex h-16 items-center px-4">
            <div className="flex items-center">
              <img
                src="/ticket-logo-secondary.png"
                alt="Ticket Runners Logo"
                className="h-12 w-auto"
              />
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-link ${
                    isActive(item.href) ? "active" : ""
                  }`}
                >
                  <Icon className={`${isRTL ? "ml-3" : "mr-3"} h-5 w-5`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
              </div>
              <div className={`${isRTL ? "mr-3" : "ml-3"}`}>
                <p className="text-sm font-medium text-gray-700">
                  {merchant?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {merchant?.mobile_number}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <LogOut className={`${isRTL ? "ml-3" : "mr-3"} h-5 w-5`} />
              {t("common.logout")}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`w-full ${isRTL ? "lg:pr-64" : "lg:pl-64"}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <LanguageToggle />
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
              <div className="flex items-center">
                <span className="text-sm text-gray-700">
                  {t("common.welcome")}, {merchant?.contact_name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
