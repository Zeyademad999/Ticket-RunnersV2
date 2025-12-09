import React from "react";
import { Card } from "@/components/ui/card";
import { formatCurrencyForLocale } from "@/lib/utils";
import { CreditCard } from "lucide-react";
import i18n from "@/lib/i18n";

interface OwnerWalletCardProps {
  owner: {
    id: string;
    name: string;
    email?: string;
    company_percentage: number;
    wallet_balance?: number;
    card_number?: string;
    owner_share?: number;
  };
  isRTL?: boolean;
  isCompanyWallet?: boolean;
  onClick?: () => void;
}

const OwnerWalletCard: React.FC<OwnerWalletCardProps> = ({ owner, isRTL = false, isCompanyWallet = false, onClick }) => {
  const balance = owner.wallet_balance || 0;
  const cardNumber = owner.card_number || "0000 0000 0000 0000";
  const formattedBalance = formatCurrencyForLocale(balance, i18n.language);

  // Generate gradient colors based on owner ID
  const getGradientColors = (id: string) => {
    const colors = [
      "from-blue-600 to-purple-600",
      "from-green-600 to-teal-600",
      "from-orange-600 to-red-600",
      "from-pink-600 to-rose-600",
      "from-indigo-600 to-blue-600",
      "from-cyan-600 to-blue-600",
    ];
    const index = parseInt(id.replace(/-/g, "").slice(0, 6), 16) % colors.length;
    return colors[index];
  };

  const gradientClass = getGradientColors(owner.id);

  return (
    <div className={`relative ${isRTL ? "rtl" : "ltr"}`}>
      <Card 
        className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        {/* Credit Card Style Front */}
        <div
          className={`relative h-48 bg-gradient-to-br ${gradientClass} text-white p-6 flex flex-col justify-between`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              <span className="text-sm font-medium">Ticket Runners</span>
            </div>
            <div className="text-xs opacity-80">WALLET</div>
          </div>

          {/* Card Number */}
          <div className="mt-4">
            <div className="text-xs opacity-80 mb-1">Card Number</div>
            <div className="text-xl font-mono tracking-wider">{cardNumber}</div>
          </div>

          {/* Owner Info */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex-1">
              <div className="text-xs opacity-80 mb-1">Owner</div>
              <div className="text-lg font-semibold truncate">{owner.name}</div>
            </div>
            {!isCompanyWallet && (
              <div className="text-right">
                <div className="text-xs opacity-80 mb-1">Share</div>
                <div className="text-lg font-semibold">{owner.company_percentage}%</div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="p-4 bg-muted/30">
          <div className="space-y-4">
            {owner.email && (
              <div className="w-full">
                <div className="text-muted-foreground text-xs mb-1.5">Email</div>
                <div className="font-medium text-sm break-all overflow-wrap-anywhere leading-relaxed">
                  {owner.email}
                </div>
              </div>
            )}
            {/* Available Balance - moved to white section */}
            <div className="w-full">
              <div className="text-muted-foreground text-xs mb-1.5">Available Balance</div>
              <div className="font-medium text-sm text-black leading-relaxed">
                {formattedBalance}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OwnerWalletCard;

