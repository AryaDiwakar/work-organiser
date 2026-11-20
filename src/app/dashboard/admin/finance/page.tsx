"use client";
import { useState, useEffect, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  Plus,
  Search,
  Pencil,
  CalendarDays,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface FinancePayment {
  id: string;
  billId: string;
  amount: number;
  receivedDate: string;
  createdAt: string;
}

interface FinanceBill {
  id: string;
  clientId: string;
  dueDate: string;
  value: number;
  paymentTowards: string;
  createdAt: string;
  client: { id: string; name: string };
  payments: FinancePayment[];
}

interface ClientOption {
  id: string;
  name: string;
}

interface BillForm {
  clientId: string;
  dueDate: string;
  value: string;
  paymentTowards: string;
}

interface PaymentForm {
  amount: string;
  receivedDate: string;
}

type Period = "current" | "last" | "custom";

const emptyBillForm: BillForm = { clientId: "", dueDate: "", value: "", paymentTowards: "" };
const emptyPaymentForm: PaymentForm = { amount: "", receivedDate: "" };

function toInputDate(value: string | Date): string {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(offset: number) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return { from: toInputDate(first), to: toInputDate(last) };
}

function todayInput() {
  return toInputDate(new Date());
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isWithin(date: string, range: { from: string; to: string }): boolean {
  const value = toInputDate(date);
  return value >= range.from && value <= range.to;
}

function sumPayments(bill: FinanceBill): number {
  return bill.payments.reduce((total, payment) => total + payment.amount, 0);
}

function outstanding(bill: FinanceBill): number {
  return Math.max(0, bill.value - sumPayments(bill));
}

export default function FinancePage() {
  const [bills, setBills] = useState<FinanceBill[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [period, setPeriod] = useState<Period>("current");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<FinanceBill | null>(null);
  const [billForm, setBillForm] = useState<BillForm>(emptyBillForm);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<FinanceBill | null>(null);
  const [editingPayment, setEditingPayment] = useState<FinancePayment | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBills();
    fetchClients();
  }, []);

  async function fetchBills() {
    try {
      const res = await fetch("/api/finance");
      const data = await res.json();
      setBills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch finance entries:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  }

  const range = useMemo(() => {
    if (period === "custom") {
      return {
        from: fromDate || "0000-01-01",
        to: toDate || "9999-12-31",
      };
    }
    return monthRange(period === "last" ? -1 : 0);
  }, [period, fromDate, toDate]);

  const periodBills = useMemo(
    () => bills.filter((bill) => isWithin(bill.dueDate, range)),
    [bills, range]
  );

  const summary = useMemo(() => {
    const totalValue = periodBills.reduce((sum, bill) => sum + bill.value, 0);
    const amountReceived = bills
      .flatMap((bill) => bill.payments)
      .filter((payment) => isWithin(payment.receivedDate, range))
      .reduce((sum, payment) => sum + payment.amount, 0);
    const amountPaid = periodBills.reduce((sum, bill) => sum + sumPayments(bill), 0);

    return {
      totalBills: periodBills.length,
      totalValue,
      amountReceived,
      amountPaid,
    };
  }, [bills, periodBills, range]);

  const clientGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Base the list on the due-date-filtered bills so the date filter applies
    // to the bill history as well as the summary cards.
    const filtered = periodBills.filter(
      (bill) =>
        !q ||
        bill.client.name.toLowerCase().includes(q) ||
        bill.paymentTowards.toLowerCase().includes(q)
    );

    const grouped = new Map<string, { client: ClientOption; bills: FinanceBill[] }>();
    for (const bill of filtered) {
      const existing = grouped.get(bill.clientId);
      if (existing) {
        existing.bills.push(bill);
      } else {
        grouped.set(bill.clientId, { client: bill.client, bills: [bill] });
      }
    }
    return Array.from(grouped.values());
  }, [periodBills, search]);

  function openAddBill(clientId?: string) {
    setEditingBill(null);
    setBillForm({ ...emptyBillForm, clientId: clientId || "", dueDate: todayInput() });
    setError("");
    setBillModalOpen(true);
  }

  function openEditBill(bill: FinanceBill) {
    setEditingBill(bill);
    setBillForm({
      clientId: bill.clientId,
      dueDate: toInputDate(bill.dueDate),
      value: String(bill.value),
      paymentTowards: bill.paymentTowards,
    });
    setError("");
    setBillModalOpen(true);
  }

  function openAddPayment(bill: FinanceBill) {
    setPaymentBill(bill);
    setEditingPayment(null);
    setPaymentForm({ ...emptyPaymentForm, receivedDate: todayInput() });
    setError("");
    setPaymentModalOpen(true);
  }

  function openEditPayment(bill: FinanceBill, payment: FinancePayment) {
    setPaymentBill(bill);
    setEditingPayment(payment);
    setPaymentForm({ amount: String(payment.amount), receivedDate: toInputDate(payment.receivedDate) });
    setError("");
    setPaymentModalOpen(true);
  }

  async function handleSaveBill() {
    if (!billForm.clientId) {
      setError("Please select a client");
      return;
    }
    if (!billForm.dueDate) {
      setError("Due date is required");
      return;
    }
    const value = Number(billForm.value);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Value must be greater than zero");
      return;
    }
    if (!billForm.paymentTowards.trim()) {
      setError("Payment towards is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingBill ? `/api/finance/${editingBill.id}` : "/api/finance", {
        method: editingBill ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: billForm.clientId,
          dueDate: billForm.dueDate,
          value,
          paymentTowards: billForm.paymentTowards.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save entry");
        return;
      }
      setBillModalOpen(false);
      await fetchBills();
    } catch (err) {
      console.error("Failed to save finance entry:", err);
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePayment() {
    if (!paymentBill) return;
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be greater than zero");
      return;
    }
    if (!paymentForm.receivedDate) {
      setError("Payment received date is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const url = editingPayment
        ? `/api/finance/payments/${editingPayment.id}`
        : `/api/finance/${paymentBill.id}/payments`;
      const res = await fetch(url, {
        method: editingPayment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, receivedDate: paymentForm.receivedDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save payment");
        return;
      }
      setPaymentModalOpen(false);
      await fetchBills();
    } catch (err) {
      console.error("Failed to save payment:", err);
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const summaryCards = [
    {
      label: "Total Bills",
      value: String(summary.totalBills),
      hint: "Payment line items in period",
      icon: Wallet,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Total Value",
      value: money(summary.totalValue),
      hint: "Value of bills in period",
      icon: TrendingUp,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Amount Received",
      value: money(summary.amountReceived),
      hint: "Payments received in period",
      icon: CheckCircle2,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Amount Paid",
      value: money(summary.amountPaid),
      hint: "Paid against bills in period",
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Track client bills, payments and outstanding amounts</p>
        </div>
        <Button onClick={() => openAddBill()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.hint}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600 mr-1">Date filter</span>
          {([
            { value: "current", label: "Current Month" },
            { value: "last", label: "Last Month" },
            { value: "custom", label: "Custom Date" },
          ] as { value: Period; label: string }[]).map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === option.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">
            {range.from === "0000-01-01" || range.to === "9999-12-31"
              ? "All available dates"
              : `${formatDate(range.from)} – ${formatDate(range.to)}`}
          </span>
        </div>
        {period === "custom" && (
          <div className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="w-44">
              <Input label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <span className="text-gray-400 pb-2">to</span>
            <div className="w-44">
              <Input label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFromDate(""); setToDate(""); }}
              >
                Clear dates
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients or payment descriptions..."
          className="block w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      ) : clientGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-12 text-center text-gray-400">
          {search
            ? "No finance entries match your search."
            : bills.length > 0
              ? "No bills are due in the selected date period."
              : "No finance entries yet. Click \"Add Entry\" to create one."}
        </div>
      ) : (
        <div className="space-y-5">
          {clientGroups.map(({ client, bills: clientBills }) => {
            const billed = clientBills.reduce((sum, bill) => sum + bill.value, 0);
            const received = clientBills.reduce((sum, bill) => sum + sumPayments(bill), 0);
            const balance = Math.max(0, billed - received);

            return (
              <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-5 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{client.name}</h2>
                      <p className="text-xs text-gray-500">
                        {clientBills.length} bill{clientBills.length !== 1 ? "s" : ""} · {money(billed)} billed · {money(received)} received
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Outstanding</p>
                      <p className={`text-sm font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                        {money(balance)}
                      </p>
                    </div>
                    <button
                      onClick={() => openAddBill(client.id)}
                      title="Add payment line item for this client"
                      className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {clientBills.map((bill) => {
                    const billReceived = sumPayments(bill);
                    const billBalance = outstanding(bill);
                    return (
                      <div key={bill.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-[220px] flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{bill.paymentTowards}</p>
                              <Badge variant={billBalance === 0 ? "success" : "warning"}>
                                {billBalance === 0 ? "Paid" : "Pending"}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Due {formatDate(bill.dueDate)}
                            </p>
                          </div>
                          <div className="flex items-start gap-6">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Bill Value</p>
                              <p className="text-sm font-semibold text-gray-900">{money(bill.value)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Received</p>
                              <p className="text-sm font-semibold text-green-600">{money(billReceived)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Outstanding</p>
                              <p className={`text-sm font-semibold ${billBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                                {money(billBalance)}
                              </p>
                            </div>
                            <button
                              onClick={() => openEditBill(bill)}
                              title="Edit bill"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pl-3 border-l-2 border-gray-100 space-y-1.5">
                          {bill.payments.length === 0 ? (
                            <p className="text-xs text-gray-400">No payments recorded for this bill yet.</p>
                          ) : (
                            bill.payments.map((payment) => (
                              <div key={payment.id} className="flex items-center gap-3 text-xs text-gray-600">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                <span>{formatDate(payment.receivedDate)}</span>
                                <span className="font-medium text-gray-900">{money(payment.amount)}</span>
                                <button
                                  onClick={() => openEditPayment(bill, payment)}
                                  title="Edit payment"
                                  className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </div>
                            ))
                          )}
                          <button
                            onClick={() => openAddPayment(bill)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 pt-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Record payment received
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit bill */}
      <Modal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        title={editingBill ? "Edit Payment Line Item" : "Add Finance Entry"}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Client Name *"
            options={clients.map((client) => ({ value: client.id, label: client.name }))}
            value={billForm.clientId}
            onChange={(e) => setBillForm({ ...billForm, clientId: e.target.value })}
            placeholder="Select a client"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date *"
              type="date"
              value={billForm.dueDate}
              onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
            />
            <Input
              label="Value (₹) *"
              type="number"
              min="0"
              step="0.01"
              value={billForm.value}
              onChange={(e) => setBillForm({ ...billForm, value: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <Input
            label="Payment Towards *"
            value={billForm.paymentTowards}
            onChange={(e) => setBillForm({ ...billForm, paymentTowards: e.target.value })}
            placeholder="e.g. Website Development, Monthly Maintenance, Social Media Management, Google Ads"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setBillModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBill} isLoading={saving}>
              {editingBill ? "Update" : "Add"} Entry
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit payment received */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={editingPayment ? "Edit Payment Received" : "Record Payment Received"}
        size="md"
      >
        <div className="space-y-4">
          {paymentBill && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{paymentBill.client.name}</span>
              {" · "}
              {paymentBill.paymentTowards}
              {" · "}
              Bill {money(paymentBill.value)}
            </div>
          )}
          <Input
            label="Payment Amount Received (₹) *"
            type="number"
            min="0"
            step="0.01"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            placeholder="0.00"
          />
          <Input
            label="Payment Received Date *"
            type="date"
            value={paymentForm.receivedDate}
            onChange={(e) => setPaymentForm({ ...paymentForm, receivedDate: e.target.value })}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} isLoading={saving}>
              {editingPayment ? "Update" : "Record"} Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
