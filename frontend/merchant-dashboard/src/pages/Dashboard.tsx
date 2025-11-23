import React, { useState, useEffect } from "react";
import {
  Package,
  CheckCircle,
  TrendingUp,
  Activity,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { apiService } from "../services/api";
import { DashboardStats, NFCCard } from "../types";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCards, setRecentCards] = useState<NFCCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsResponse, cardsResponse] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getCards(),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (cardsResponse.success && cardsResponse.data) {
        // Get recent 5 cards
        const recent = cardsResponse.data
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() -
              new Date(a.updated_at).getTime()
          )
          .slice(0, 5);
        setRecentCards(recent);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "badge badge-success";
      case "assigned":
        return "badge badge-warning";
      case "delivered":
        return "badge badge-info";
      default:
        return "badge bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <Package className="h-4 w-4" />;
      case "assigned":
        return <Activity className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dashboard.title")}
        </h1>
        <p className="text-gray-600">{t("dashboard.overview")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-success-600" />
              </div>
            </div>
            <div className={`${isRTL ? "ml-4" : "ml-4"}`}>
              <p className="text-sm font-medium text-gray-500">
                {t("dashboard.availableCards")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_available_cards || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            <div className={`${isRTL ? "ml-4" : "ml-4"}`}>
              <p className="text-sm font-medium text-gray-500">
                {t("dashboard.deliveredCards")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.total_delivered_cards || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("dashboard.recentActivity")}
          </h2>
          <button
            onClick={() => (window.location.href = "/inventory")}
            className="text-sm text-primary-600 hover:text-primary-500 font-medium flex items-center"
          >
            {t("common.view")} {t("common.all")}
            {isRTL ? (
              <ArrowLeft className="mr-1 h-4 w-4" />
            ) : (
              <ArrowRight className="ml-1 h-4 w-4" />
            )}
          </button>
        </div>

        {recentCards.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t("dashboard.noRecentActivity")}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {t("dashboard.noRecentActivity")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      isRTL ? "text-right" : "text-left"
                    }`}
                  >
                    {t("inventory.cardNumber")}
                  </th>
                  <th
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      isRTL ? "text-right" : "text-left"
                    }`}
                  >
                    {t("inventory.status")}
                  </th>
                  <th
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      isRTL ? "text-right" : "text-left"
                    }`}
                  >
                    {t("assignCard.customerName")}
                  </th>
                  <th
                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      isRTL ? "text-right" : "text-left"
                    }`}
                  >
                    {t("inventory.lastUpdated")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentCards.map((card) => (
                  <tr key={card.id} className="table-row">
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 ${
                        isRTL ? "text-right" : "text-left"
                      }`}
                    >
                      {card.serial_number}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap ${
                        isRTL ? "text-right" : "text-left"
                      }`}
                    >
                      <span
                        className={`${getStatusColor(
                          card.status
                        )} flex items-center ${
                          isRTL ? "justify-end" : "justify-start"
                        }`}
                      >
                        {getStatusIcon(card.status)}
                        <span
                          className={`${isRTL ? "mr-1" : "ml-1"} capitalize`}
                        >
                          {card.status}
                        </span>
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                        isRTL ? "text-right" : "text-left"
                      }`}
                    >
                      {card.customer_mobile || "—"}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                        isRTL ? "text-right" : "text-left"
                      }`}
                    >
                      {new Date(card.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboard.quickActions")}
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => (window.location.href = "/assign-card")}
              className="w-full btn-primary flex items-center justify-center"
            >
              <Package className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
              {t("dashboard.assignNewCard")}
            </button>
            <button
              onClick={() => (window.location.href = "/inventory")}
              className="w-full btn-secondary flex items-center justify-center"
            >
              <Activity className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
              {t("dashboard.viewInventory")}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboard.systemStatus")}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {t("dashboard.apiConnection")}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                {t("dashboard.connected")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {t("dashboard.lastSync")}
              </span>
              <span className="text-sm text-gray-900">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
