import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financesApi } from "@/lib/api/adminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RTLTable,
  RTLTableCell,
  RTLTableHeader,
} from "@/components/ui/rtl-provider";
import { ResponsivePagination } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  DollarSign,
  Receipt,
  Tag,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ExportDialog } from "@/components/ui/export-dialog";
import { formatCurrencyForLocale, formatNumberForLocale } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";

// Types
interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string; // Backend uses category as string choice
  date: string;
  createdAt: string;
  createdBy?: string;
  deduct_from_wallet?: boolean;
  wallet_type?: "company" | "owner" | null;
  wallet_id?: string | null;
}

// Backend category choices
const EXPENSE_CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'technology', label: 'Technology' },
  { value: 'staff', label: 'Staff' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
] as const;

interface ExpenseCategory {
  value: string;
  label: string;
  totalPayments: number;
  totalAmount: number;
}

const ExpensesManagement: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState("expenses");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [expensesPerPage] = useState(25);

  // Dialog states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "",
    date: "",
    deduct_from_wallet: false,
    wallet_type: "" as "company" | "owner" | "",
    wallet_id: "",
  });

  // Selected items for editing
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18nInstance.language === "ar" ? ar : enUS;
  };

  // Format date for current locale
  const formatDateForLocale = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "PPP", { locale: getDateLocale() });
  };

  // Fetch expenses from API
  const { data: expensesData, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: ['expenses', searchTerm, selectedCategory, dateFrom, dateTo, currentPage, expensesPerPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: expensesPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      return await financesApi.getExpenses(params);
    },
  });

  // Fetch owners for wallet selection
  const { data: ownersData } = useQuery({
    queryKey: ["owners"],
    queryFn: () => financesApi.getOwners(),
  });

  // Transform API expenses to match Expense interface
  const expenses: Expense[] = useMemo(() => {
    if (!expensesData?.results) return [];
    return expensesData.results.map((item: any) => ({
      id: item.id?.toString() || '',
      description: item.description || '',
      amount: parseFloat(item.amount) || 0,
      category: item.category || '',
      date: item.date || item.created_at || '',
      createdAt: item.created_at || item.createdAt || '',
      createdBy: item.created_by?.username || item.created_by?.name || undefined,
    }));
  }, [expensesData]);

  // Calculate categories from expenses
  const categories: ExpenseCategory[] = useMemo(() => {
    const categoryMap = new Map<string, ExpenseCategory>();
    
    EXPENSE_CATEGORIES.forEach((cat) => {
      categoryMap.set(cat.value, {
        value: cat.value,
        label: cat.label,
        totalPayments: 0,
        totalAmount: 0,
      });
    });
    
    expenses.forEach((expense) => {
      if (expense.category && categoryMap.has(expense.category)) {
        const category = categoryMap.get(expense.category)!;
        category.totalPayments += 1;
        category.totalAmount += expense.amount;
      }
    });
    
    return Array.from(categoryMap.values());
  }, [expenses]);

  // Filtered expenses (API handles filtering, but we also do client-side amount filtering)
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;
    
    // Client-side amount filtering
    if (amountMin) {
      const min = parseFloat(amountMin);
      if (!isNaN(min)) {
        filtered = filtered.filter(expense => expense.amount >= min);
      }
    }
    if (amountMax) {
      const max = parseFloat(amountMax);
      if (!isNaN(max)) {
        filtered = filtered.filter(expense => expense.amount <= max);
      }
    }
    
    return filtered;
  }, [expenses, amountMin, amountMax]);

  // Calculate highest expense
  const highestExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return null;
    return filteredExpenses.reduce((max, expense) => 
      expense.amount > max.amount ? expense : max
    );
  }, [filteredExpenses]);

  // Pagination - API handles pagination, so we use the data directly
  const totalPages = expensesData?.total_pages || 1;
  const startIndex = expensesData?.page ? (expensesData.page - 1) * expensesData.page_size : 0;
  const endIndex = startIndex + (expensesData?.page_size || expensesPerPage);
  const paginatedExpenses = filteredExpenses; // API already paginates

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, dateFrom, dateTo, amountMin, amountMax]);

  // Calculate totals
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const totalCategories = categories.filter(cat => cat.totalPayments > 0).length;

  // Handle expense form changes
  const handleExpenseFormChange = (field: string, value: string | boolean) => {
    setExpenseForm((prev) => ({ ...prev, [field]: value }));
  };

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: financesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setExpenseForm({
        description: "",
        amount: "",
        category: "",
        date: "",
        deduct_from_wallet: false,
        wallet_type: "",
        wallet_id: "",
      });
      setShowAddExpense(false);
      toast({
        title: t("expenses.toast.expenseAdded"),
        description: t("expenses.toast.expenseAddedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("expenses.toast.error"),
        description: error?.response?.data?.detail || error?.message || t("expenses.toast.errorDesc"),
        variant: "destructive",
      });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => financesApi.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowEditExpense(false);
      setSelectedExpense(null);
      toast({
        title: t("expenses.toast.expenseUpdated"),
        description: t("expenses.toast.expenseUpdatedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("expenses.toast.error"),
        description: error?.response?.data?.detail || error?.message || t("expenses.toast.errorDesc"),
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: financesApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: t("expenses.toast.expenseDeleted"),
        description: t("expenses.toast.expenseDeletedDesc"),
      });
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t("expenses.toast.error"),
        description: error?.response?.data?.detail || error?.message || t("expenses.toast.errorDesc"),
        variant: "destructive",
      });
    },
  });

  // Add new expense
  const handleAddExpense = () => {
    if (
      !expenseForm.description ||
      !expenseForm.amount ||
      !expenseForm.category ||
      !expenseForm.date
    ) {
      toast({
        title: t("expenses.toast.error"),
        description: t("expenses.toast.errorDesc"),
        variant: "destructive",
      });
      return;
    }

    // Validate wallet fields if deduct_from_wallet is enabled
    if (expenseForm.deduct_from_wallet) {
      if (!expenseForm.wallet_type) {
        toast({
          title: t("expenses.toast.error"),
          description: "Please select a wallet type",
          variant: "destructive",
        });
        return;
      }
      if (expenseForm.wallet_type === "owner" && !expenseForm.wallet_id) {
        toast({
          title: t("expenses.toast.error"),
          description: "Please select an owner wallet",
          variant: "destructive",
        });
        return;
      }
    }

    createExpenseMutation.mutate({
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description,
      date: expenseForm.date,
      deduct_from_wallet: expenseForm.deduct_from_wallet,
      wallet_type: expenseForm.deduct_from_wallet ? expenseForm.wallet_type : null,
      wallet_id: expenseForm.deduct_from_wallet && expenseForm.wallet_type === "owner" ? expenseForm.wallet_id : null,
    });
  };


  // Edit expense
  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    const expenseData = expense as any; // Type assertion to access wallet fields
    setExpenseForm({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date.split("T")[0],
      deduct_from_wallet: expenseData.deduct_from_wallet || false,
      wallet_type: expenseData.wallet_type || "",
      wallet_id: expenseData.wallet_id || "",
    });
    setShowEditExpense(true);
  };

  // Save expense changes
  const handleSaveExpenseChanges = () => {
    if (!selectedExpense) return;

    // Validate wallet fields if deduct_from_wallet is enabled
    if (expenseForm.deduct_from_wallet) {
      if (!expenseForm.wallet_type) {
        toast({
          title: t("expenses.toast.error"),
          description: "Please select a wallet type",
          variant: "destructive",
        });
        return;
      }
      if (expenseForm.wallet_type === "owner" && !expenseForm.wallet_id) {
        toast({
          title: t("expenses.toast.error"),
          description: "Please select an owner wallet",
          variant: "destructive",
        });
        return;
      }
    }

    updateExpenseMutation.mutate({
      id: selectedExpense.id,
      data: {
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        date: expenseForm.date,
        deduct_from_wallet: expenseForm.deduct_from_wallet,
        wallet_type: expenseForm.deduct_from_wallet ? expenseForm.wallet_type : null,
        wallet_id: expenseForm.deduct_from_wallet && expenseForm.wallet_type === "owner" ? expenseForm.wallet_id : null,
      },
    });
  };

  // Delete expense
  const handleDeleteExpense = (expenseId: string | number) => {
    // Convert expenseId to string for comparison
    const expenseIdStr = String(expenseId);
    
    // Try to find in expenses array first (mapped data)
    let expense = expenses.find((e) => String(e.id) === expenseIdStr);
    let rawExpense: any = null;
    
    // If not found, try in expensesData.results (raw API data)
    if (!expense) {
      rawExpense = expensesData?.results?.find((e: any) => String(e.id) === expenseIdStr);
    }
    
    if (expense) {
      // Use mapped expense data
      setExpenseToDelete(expense);
    } else if (rawExpense) {
      // Use raw API data
      setExpenseToDelete({
        id: String(rawExpense.id),
        description: rawExpense.description || '',
        amount: parseFloat(rawExpense.amount) || 0,
        category: rawExpense.category || '',
        date: rawExpense.date || '',
        createdAt: rawExpense.created_at || rawExpense.createdAt || '',
        createdBy: rawExpense.created_by || rawExpense.createdBy || undefined,
      });
    } else {
      // Fallback: create expense object from ID if not found
      setExpenseToDelete({
        id: expenseIdStr,
        description: '',
        amount: 0,
        category: '',
        date: '',
        createdAt: '',
      });
    }
    
    // Always open the dialog
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteExpense = () => {
    if (expenseToDelete) {
      deleteExpenseMutation.mutate(expenseToDelete.id);
    }
  };

  return (
    <div
      className="space-y-6"
      dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="mb-8 rtl:text-right">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("expenses.title")}
        </h2>
        <p className="text-muted-foreground">{t("expenses.subtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("expenses.stats.totalExpenses")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold currency-container">
              {formatCurrencyForLocale(totalExpenses, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("expenses.stats.totalAmount")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("expenses.stats.categories")}
              </CardTitle>
            </div>
            <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(totalCategories, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("expenses.stats.activeCategories")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("expenses.stats.highestExpense") || "Highest Expense"}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold currency-container">
              {highestExpense 
                ? formatCurrencyForLocale(highestExpense.amount, i18n.language)
                : formatCurrencyForLocale(0, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right truncate">
              {highestExpense 
                ? highestExpense.description || t("expenses.stats.noDescription") || "No description"
                : t("expenses.stats.noExpenses") || "No expenses"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("expenses.stats.totalCount") || "Total Expenses"}
              </CardTitle>
            </div>
            <Receipt className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(filteredExpenses.length, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("expenses.stats.filteredCount") || "Filtered expenses"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 rtl:flex-row-reverse">
          <TabsTrigger value="expenses" className="rtl:text-right">
            {t("expenses.tabs.expenses")}
          </TabsTrigger>
          <TabsTrigger value="categories" className="rtl:text-right">
            {t("expenses.tabs.categories")}
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold rtl:text-right">
                {t("expenses.expenses.title")}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground rtl:text-right">
                {t("expenses.expenses.subtitle", {
                  count: filteredExpenses.length,
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <ExportDialog
                data={filteredExpenses}
                columns={[
                  { header: "Description", key: "description", width: 40 },
                  {
                    header: "Amount",
                    key: "amount",
                    width: 20,
                    formatter: (value) =>
                      formatCurrencyForLocale(value, i18nInstance.language),
                  },
                  { header: "Category", key: "category", width: 20 },
                  {
                    header: "Date",
                    key: "date",
                    width: 20,
                    formatter: formatDateForLocale,
                  },
                ]}
                title={t("expenses.expenses.title")}
                subtitle={t("expenses.expenses.subtitle", {
                  count: filteredExpenses.length,
                })}
                filename="expenses"
              >
                <Button
                  variant="outline"
                  className="flex items-center gap-2 rtl:flex-row-reverse text-xs sm:text-sm"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">
                    {t("expenses.actions.export")}
                  </span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </ExportDialog>

              <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 rtl:flex-row-reverse text-xs sm:text-sm">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">
                      {t("expenses.actions.addExpense")}
                    </span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {t("expenses.dialogs.addExpense.title")}
                    </DialogTitle>
                    <DialogDescription className="rtl:text-right">
                      {t("expenses.dialogs.addExpense.subtitle")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description" className="rtl:text-right">
                        {t("expenses.form.description") || "Description"}
                      </Label>
                      <Textarea
                        id="description"
                        value={expenseForm.description}
                        onChange={(e) =>
                          handleExpenseFormChange("description", e.target.value)
                        }
                        placeholder={t("expenses.form.descriptionPlaceholder") || "Enter expense description"}
                        className="rtl:text-right"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="rtl:text-right">
                          {t("expenses.form.amount")}
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={expenseForm.amount}
                          onChange={(e) =>
                            handleExpenseFormChange("amount", e.target.value)
                          }
                          placeholder={t("expenses.form.amountPlaceholder")}
                          className="rtl:text-right"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category" className="rtl:text-right">
                          {t("expenses.form.category")}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="category"
                            type="text"
                            value={expenseForm.category}
                            onChange={(e) =>
                              handleExpenseFormChange("category", e.target.value)
                            }
                            placeholder={t("expenses.form.selectCategory")}
                            className="flex-1 rtl:text-right"
                          />
                          <Select
                            value={expenseForm.category}
                            onValueChange={(value) =>
                              handleExpenseFormChange("category", value)
                            }
                          >
                            <SelectTrigger className="w-[100px] rtl:text-right">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground rtl:text-right">
                          {t("expenses.form.categoryHint", "Type a new category or select from existing ones")}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date" className="rtl:text-right">
                        {t("expenses.form.date")}
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={expenseForm.date}
                        onChange={(e) =>
                          handleExpenseFormChange("date", e.target.value)
                        }
                        className="rtl:text-right"
                      />
                    </div>
                    
                    {/* Wallet Deduction Section */}
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Checkbox
                          id="deduct_from_wallet"
                          checked={expenseForm.deduct_from_wallet}
                          onCheckedChange={(checked) =>
                            handleExpenseFormChange("deduct_from_wallet", checked as boolean)
                          }
                        />
                        <Label
                          htmlFor="deduct_from_wallet"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 rtl:text-right"
                        >
                          Deduct from wallet
                        </Label>
                      </div>
                      
                      {expenseForm.deduct_from_wallet && (
                        <div className="space-y-3 pl-6 rtl:pl-0 rtl:pr-6">
                          <div className="space-y-2">
                            <Label htmlFor="wallet_type" className="rtl:text-right">
                              Wallet Type
                            </Label>
                            <Select
                              value={expenseForm.wallet_type}
                              onValueChange={(value) => {
                                handleExpenseFormChange("wallet_type", value);
                                if (value !== "owner") {
                                  handleExpenseFormChange("wallet_id", "");
                                }
                              }}
                            >
                              <SelectTrigger className="rtl:text-right">
                                <SelectValue placeholder="Select wallet type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="company">Ticket Runners Wallet</SelectItem>
                                <SelectItem value="owner">Owner Wallet</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {expenseForm.wallet_type === "owner" && (
                            <div className="space-y-2">
                              <Label htmlFor="wallet_id" className="rtl:text-right">
                                Select Owner
                              </Label>
                              <Select
                                value={expenseForm.wallet_id}
                                onValueChange={(value) =>
                                  handleExpenseFormChange("wallet_id", value)
                                }
                              >
                                <SelectTrigger className="rtl:text-right">
                                  <SelectValue placeholder="Select owner" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ownersData?.filter((owner: any) => owner.wallet?.id).map((owner: any) => (
                                    <SelectItem key={owner.id} value={owner.wallet.id}>
                                      {owner.name} ({owner.wallet?.balance ? formatCurrencyForLocale(owner.wallet.balance, i18nInstance.language) : "0.00"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 rtl:flex-row-reverse">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddExpense(false)}
                    >
                      {t("admin.common.cancel")}
                    </Button>
                    <Button onClick={handleAddExpense}>
                      {t("expenses.actions.addExpense")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 rtl:flex-row-reverse">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 rtl:left-auto rtl:right-3" />
                <Input
                  placeholder={t("expenses.search.placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rtl:pl-3 rtl:pr-10"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[150px] rtl:text-right">
                  <SelectValue placeholder={t("expenses.filters.category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("expenses.filters.allCategories")}
                  </SelectItem>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Range and Amount Filters */}
            <div className="flex flex-col sm:flex-row gap-4 rtl:flex-row-reverse">
              <div className="flex gap-2 rtl:flex-row-reverse">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="dateFrom" className="text-xs rtl:text-right">
                    {t("expenses.filters.dateFrom") || "From Date"}
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rtl:text-right"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="dateTo" className="text-xs rtl:text-right">
                    {t("expenses.filters.dateTo") || "To Date"}
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rtl:text-right"
                  />
                </div>
              </div>
              <div className="flex gap-2 rtl:flex-row-reverse">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="amountMin" className="text-xs rtl:text-right">
                    {t("expenses.filters.minAmount") || "Min Amount"}
                  </Label>
                  <Input
                    id="amountMin"
                    type="number"
                    step="0.01"
                    placeholder={t("expenses.filters.minAmountPlaceholder") || "Min"}
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    className="rtl:text-right"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="amountMax" className="text-xs rtl:text-right">
                    {t("expenses.filters.maxAmount") || "Max Amount"}
                  </Label>
                  <Input
                    id="amountMax"
                    type="number"
                    step="0.01"
                    placeholder={t("expenses.filters.maxAmountPlaceholder") || "Max"}
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    className="rtl:text-right"
                  />
                </div>
              </div>
              {(dateFrom || dateTo || amountMin || amountMax) && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setAmountMin("");
                      setAmountMax("");
                    }}
                    className="h-10"
                  >
                    {t("expenses.filters.clearFilters") || "Clear Filters"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Expenses Table */}
          <Card>
            <CardContent className="p-0">
              <div className="relative w-full overflow-auto">
                <RTLTable>
                  <TableHeader>
                    <TableRow>
                      <RTLTableHeader>
                        {t("expenses.table.description") || "Description"}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.amount")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.category")}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.date") || "Date"}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("admin.common.actions")}
                      </RTLTableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                          <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
                        </TableCell>
                      </TableRow>
                    ) : expensesError ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                          <span className="ml-2 text-red-500">
                            {t("common.error")}: {expensesError instanceof Error ? expensesError.message : t("expenses.toast.error")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : paginatedExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">{t("expenses.noExpensesFound")}</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <RTLTableCell>
                          <div className="font-medium">{expense.description}</div>
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="font-medium currency-container">
                            {formatCurrencyForLocale(
                              expense.amount,
                              i18nInstance.language
                            )}
                          </div>
                        </RTLTableCell>
                        <RTLTableCell>
                          <Badge variant="secondary">
                            {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                          </Badge>
                        </RTLTableCell>
                        <RTLTableCell>
                          {formatDateForLocale(expense.date)}
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="flex items-center gap-2 rtl:flex-row-reverse">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditExpense(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </RTLTableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </RTLTable>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {!expensesLoading && !expensesError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("expenses.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, expensesData?.count || 0)} ${t(
                "expenses.pagination.of"
              )} ${formatNumberForLocale(
                expensesData?.count || 0,
                i18nInstance.language
              )} ${t("expenses.pagination.results")}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={expensesData?.count || 0}
              itemsPerPage={expensesPerPage}
              className="mt-4"
            />
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <div>
              <h3 className="text-lg font-semibold rtl:text-right">
                {t("expenses.categories.title")}
              </h3>
              <p className="text-sm text-muted-foreground rtl:text-right">
                {t("expenses.categories.subtitle", {
                  count: categories.filter(c => c.totalPayments > 0).length,
                })}
              </p>
            </div>
          </div>

          {/* Categories Table */}
          <Card>
            <CardContent className="p-0">
              <div className="relative w-full overflow-auto">
                <RTLTable>
                  <TableHeader>
                    <TableRow>
                      <RTLTableHeader>
                        {t("expenses.table.name") || "Category"}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.totalPayments") || "Total Expenses"}
                      </RTLTableHeader>
                      <RTLTableHeader>
                        {t("expenses.table.totalAmount") || "Total Amount"}
                      </RTLTableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories
                      .filter(cat => cat.totalPayments > 0)
                      .map((category) => (
                      <TableRow key={category.value}>
                        <RTLTableCell className="font-medium">
                          {category.label}
                        </RTLTableCell>
                        <RTLTableCell>
                          {formatNumberForLocale(
                            category.totalPayments,
                            i18nInstance.language
                          )}
                        </RTLTableCell>
                        <RTLTableCell>
                          <div className="font-medium currency-container">
                            {formatCurrencyForLocale(
                              category.totalAmount,
                              i18nInstance.language
                            )}
                          </div>
                        </RTLTableCell>
                      </TableRow>
                    ))}
                    {categories.filter(cat => cat.totalPayments > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                          <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">{t("expenses.noCategoriesFound") || "No categories found"}</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </RTLTable>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditExpense} onOpenChange={setShowEditExpense}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("expenses.dialogs.editExpense.title")}</DialogTitle>
            <DialogDescription className="rtl:text-right">
              {t("expenses.dialogs.editExpense.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDescription" className="rtl:text-right">
                {t("expenses.form.description") || "Description"}
              </Label>
              <Textarea
                id="editDescription"
                value={expenseForm.description}
                onChange={(e) =>
                  handleExpenseFormChange("description", e.target.value)
                }
                placeholder={t("expenses.form.descriptionPlaceholder") || "Enter expense description"}
                className="rtl:text-right"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div className="space-y-2">
                <Label htmlFor="editAmount" className="rtl:text-right">
                  {t("expenses.form.amount")}
                </Label>
                <Input
                  id="editAmount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    handleExpenseFormChange("amount", e.target.value)
                  }
                  placeholder={t("expenses.form.amountPlaceholder")}
                  className="rtl:text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategory" className="rtl:text-right">
                  {t("expenses.form.category")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="editCategory"
                    type="text"
                    value={expenseForm.category}
                    onChange={(e) =>
                      handleExpenseFormChange("category", e.target.value)
                    }
                    placeholder={t("expenses.form.selectCategory")}
                    className="flex-1 rtl:text-right"
                  />
                  <Select
                    value={expenseForm.category}
                    onValueChange={(value) =>
                      handleExpenseFormChange("category", value)
                    }
                  >
                    <SelectTrigger className="w-[100px] rtl:text-right">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  {t("expenses.form.categoryHint", "Type a new category or select from existing ones")}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDate" className="rtl:text-right">
                {t("expenses.form.date")}
              </Label>
              <Input
                id="editDate"
                type="date"
                value={expenseForm.date}
                onChange={(e) =>
                  handleExpenseFormChange("date", e.target.value)
                }
                className="rtl:text-right"
              />
            </div>
            
            {/* Wallet Deduction Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Checkbox
                  id="edit_deduct_from_wallet"
                  checked={expenseForm.deduct_from_wallet}
                  onCheckedChange={(checked) =>
                    handleExpenseFormChange("deduct_from_wallet", checked as boolean)
                  }
                />
                <Label
                  htmlFor="edit_deduct_from_wallet"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 rtl:text-right"
                >
                  Deduct from wallet
                </Label>
              </div>
              
              {expenseForm.deduct_from_wallet && (
                <div className="space-y-3 pl-6 rtl:pl-0 rtl:pr-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit_wallet_type" className="rtl:text-right">
                      Wallet Type
                    </Label>
                    <Select
                      value={expenseForm.wallet_type}
                      onValueChange={(value) => {
                        handleExpenseFormChange("wallet_type", value);
                        if (value !== "owner") {
                          handleExpenseFormChange("wallet_id", "");
                        }
                      }}
                    >
                      <SelectTrigger className="rtl:text-right">
                        <SelectValue placeholder="Select wallet type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Ticket Runners Wallet</SelectItem>
                        <SelectItem value="owner">Owner Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {expenseForm.wallet_type === "owner" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit_wallet_id" className="rtl:text-right">
                        Select Owner
                      </Label>
                      <Select
                        value={expenseForm.wallet_id}
                        onValueChange={(value) =>
                          handleExpenseFormChange("wallet_id", value)
                        }
                      >
                        <SelectTrigger className="rtl:text-right">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                                <SelectContent>
                                  {ownersData?.filter((owner: any) => owner.wallet?.id).map((owner: any) => (
                                    <SelectItem key={owner.id} value={owner.wallet.id}>
                                      {owner.name} ({owner.wallet?.balance ? formatCurrencyForLocale(owner.wallet.balance, i18nInstance.language) : "0.00"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditExpense(false);
                setSelectedExpense(null);
              }}
            >
              {t("admin.common.cancel")}
            </Button>
            <Button onClick={handleSaveExpenseChanges}>
              {t("expenses.actions.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("expenses.dialogs.deleteExpense") || "Delete Expense"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {expenseToDelete
                ? t("expenses.dialogs.deleteExpenseConfirm", {
                    description: expenseToDelete.description || expenseToDelete.id,
                    amount: formatCurrencyForLocale(expenseToDelete.amount, i18nInstance.language),
                  }) || `Are you sure you want to delete the expense "${expenseToDelete.description}" (${formatCurrencyForLocale(expenseToDelete.amount, i18nInstance.language)})? This action cannot be undone.`
                : t("expenses.dialogs.deleteExpenseConfirm", { description: "", amount: "" }) || "Are you sure you want to delete this expense? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setExpenseToDelete(null);
              }}
            >
              {t("expenses.dialogs.cancel") || t("common.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteExpense}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("expenses.actions.deleteExpense") || "Delete Expense"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesManagement;
