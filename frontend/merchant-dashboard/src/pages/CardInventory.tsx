import React, { useState, useEffect } from "react";
import {
  Package,
  CheckCircle,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  Calendar,
  User,
  Phone,
  CreditCard,
  Hash,
} from "lucide-react";
import { apiService } from "../services/api";
import { NFCCard, DashboardStats } from "../types";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

const CardInventory: React.FC = () => {
  const [cards, setCards] = useState<NFCCard[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "assigned" | "delivered"
  >("all");
  const [selectedCard, setSelectedCard] = useState<NFCCard | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (statusFilter !== "all" || searchTerm) {
      fetchInventoryData();
    }
  }, [statusFilter, searchTerm]);

  const fetchInventoryData = async () => {
    setIsLoading(true);
    try {
      const [cardsResponse, statsResponse] = await Promise.all([
        apiService.getCards(
          statusFilter !== "all" ? statusFilter : undefined,
          searchTerm || undefined
        ),
        apiService.getDashboardStats(),
      ]);

      if (cardsResponse.success && cardsResponse.data) {
        setCards(cardsResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load inventory data");
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

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.customer_mobile && card.customer_mobile.includes(searchTerm));
    const matchesStatus =
      statusFilter === "all" || card.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return cards.filter((card) => card.status === status).length;
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("inventory.title")}
          </h1>
          <p className="text-gray-600">{t("inventory.title")}</p>
        </div>
        <button
          onClick={fetchInventoryData}
          className="btn-secondary flex items-center"
        >
          <RefreshCw className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
          {t("common.refresh")}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-success-600" />
              </div>
            </div>
            <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
              <p className="text-sm font-medium text-gray-500">
                {t("inventory.available")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {getStatusCount("available")}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-warning-600" />
              </div>
            </div>
            <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
              <p className="text-sm font-medium text-gray-500">
                {t("inventory.assigned")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {getStatusCount("assigned")}
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
            <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
              <p className="text-sm font-medium text-gray-500">
                {t("inventory.delivered")}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {getStatusCount("delivered")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search
                className={`absolute ${
                  isRTL ? "right-3" : "left-3"
                } top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`}
              />
              <input
                type="text"
                placeholder={t("inventory.searchCards")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">{t("inventory.filterByStatus")}</option>
              <option value="available">{t("inventory.available")}</option>
              <option value="assigned">{t("inventory.assigned")}</option>
              <option value="delivered">{t("inventory.delivered")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("inventory.totalCards")} ({filteredCards.length})
          </h2>
        </div>

        {filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t("inventory.noCardsFound")}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== "all"
                ? t("inventory.noCardsFound")
                : t("inventory.noCardsFound")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.cardNumber")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.status")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("assignCard.customerPhone")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.assignedDate")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.deliveredDate")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("inventory.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCards.map((card) => (
                  <tr key={card.id} className="table-row">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {card.serial_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusColor(card.status)}>
                        {getStatusIcon(card.status)}
                        <span className={`${isRTL ? 'mr-1' : 'ml-1'} capitalize`}>{card.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.customer_mobile || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.assigned_at
                        ? new Date(card.assigned_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.delivered_at
                        ? new Date(card.delivered_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedCard(card);
                          setShowDetailsModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Eye className={`h-4 w-4 ${isRTL ? "ml-1" : "mr-1"}`} />
                        {t("common.view")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("inventory.title")} {t("common.summary")}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                {t("inventory.totalCards")}:
              </span>
              <span className="text-sm font-medium text-gray-900">
                {cards.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                {t("inventory.available")}:
              </span>
              <span className="text-sm font-medium text-success-600">
                {getStatusCount("available")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                {t("inventory.assigned")}:
              </span>
              <span className="text-sm font-medium text-warning-600">
                {getStatusCount("assigned")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                {t("inventory.delivered")}:
              </span>
              <span className="text-sm font-medium text-primary-600">
                {getStatusCount("delivered")}
              </span>
            </div>
          </div>
        </div>

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
              {t("assignCard.assignCard")}
            </button>
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="w-full btn-secondary flex items-center justify-center"
            >
              <RefreshCw className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
              {t("common.clear")}
            </button>
          </div>
        </div>
      </div>

      {/* Card Details Modal */}
      {showDetailsModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <CreditCard className={`h-6 w-6 ${isRTL ? "ml-2" : "mr-2"}`} />
                {t("inventory.cardDetails") || "Card Details"}
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCard(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Card Number */}
              <div className="flex items-start">
                <Hash className={`h-5 w-5 text-gray-400 mt-1 ${isRTL ? "ml-3" : "mr-3"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    {t("inventory.cardNumber")}
                  </p>
                  <p className="text-lg font-mono text-gray-900 mt-1">
                    {selectedCard.serial_number}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-start">
                <Activity className={`h-5 w-5 text-gray-400 mt-1 ${isRTL ? "ml-3" : "mr-3"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">
                    {t("inventory.status")}
                  </p>
                  <span className={`inline-flex items-center mt-1 ${getStatusColor(selectedCard.status)}`}>
                    {getStatusIcon(selectedCard.status)}
                    <span className={`${isRTL ? 'mr-1' : 'ml-1'} capitalize`}>
                      {selectedCard.status}
                    </span>
                  </span>
                </div>
              </div>

              {/* Customer Information */}
              {selectedCard.customer_name && (
                <>
                  <div className="flex items-start">
                    <User className={`h-5 w-5 text-gray-400 mt-1 ${isRTL ? "ml-3" : "mr-3"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">
                        {t("assignCard.customerName") || "Customer Name"}
                      </p>
                      <p className="text-lg text-gray-900 mt-1">
                        {selectedCard.customer_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Phone className={`h-5 w-5 text-gray-400 mt-1 ${isRTL ? "ml-3" : "mr-3"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">
                        {t("assignCard.customerPhone")}
                      </p>
                      <p className="text-lg text-gray-900 mt-1">
                        {selectedCard.customer_mobile || "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Dates */}
              <div className="flex items-start">
                <Calendar className={`h-5 w-5 text-gray-400 mt-1 ${isRTL ? "ml-3" : "mr-3"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-3">
                    {t("inventory.dates") || "Dates"}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("inventory.assignedDate")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedCard.assigned_at
                          ? new Date(selectedCard.assigned_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        {t("inventory.deliveredDate")}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedCard.delivered_at
                          ? new Date(selectedCard.delivered_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                    {(selectedCard as any).issue_date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {t("inventory.issueDate") || "Issue Date"}:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date((selectedCard as any).issue_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                    {(selectedCard as any).expiry_date && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          {t("inventory.expiryDate") || "Expiry Date"}:
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date((selectedCard as any).expiry_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Hashed Code */}
              {selectedCard.hashed_code && (
                <div className="flex items-start">
                  <Hash className={`h-5 w-5 text-gray-400 mt-1 ${isRTL ? "ml-3" : "mr-3"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">
                      {t("inventory.hashedCode") || "Hashed Code"}
                    </p>
                    <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                      {selectedCard.hashed_code}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {(selectedCard as any).balance !== undefined && (selectedCard as any).balance !== null && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        {t("inventory.balance") || "Balance"}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {typeof (selectedCard as any).balance === 'number' 
                          ? (selectedCard as any).balance.toFixed(2)
                          : parseFloat(String((selectedCard as any).balance || 0)).toFixed(2)} EGP
                      </p>
                    </div>
                  )}
                  {(selectedCard as any).card_type && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        {t("inventory.cardType") || "Card Type"}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                        {(selectedCard as any).card_type}
                      </p>
                    </div>
                  )}
                  {(selectedCard as any).usage_count !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        {t("inventory.usageCount") || "Usage Count"}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {(selectedCard as any).usage_count || 0}
                      </p>
                    </div>
                  )}
                  {(selectedCard as any).last_used && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        {t("inventory.lastUsed") || "Last Used"}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {new Date((selectedCard as any).last_used).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCard(null);
                }}
                className="btn-primary"
              >
                {t("common.close") || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardInventory;
