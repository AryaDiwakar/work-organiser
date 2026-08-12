export const CAMPAIGN_TYPES = [
  "AWARENESS",
  "TRAFFIC",
  "GOOGLE_ADS",
  "GOOGLE_SHOPPING",
  "SALES",
  "ENGAGEMENT",
  "LEADS",
  "APP_PROMOTION",
  "OTHERS",
] as const;

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  AWARENESS: "Awareness",
  TRAFFIC: "Traffic",
  GOOGLE_ADS: "Google Ads",
  GOOGLE_SHOPPING: "Google Shopping",
  SALES: "Sales",
  ENGAGEMENT: "Engagement",
  LEADS: "Leads",
  APP_PROMOTION: "App Promotion",
  OTHERS: "Others",
};

export const METRICS = [
  { key: "reach", label: "Reach" },
  { key: "impressions", label: "Impressions" },
  { key: "engagement", label: "Engagement" },
  { key: "sales", label: "Sales" },
  { key: "appInstalls", label: "App Installs" },
  { key: "inAppPurchases", label: "In App Purchases" },
  { key: "costPerResult", label: "Cost per Result" },
  { key: "amountSpent", label: "Amount Spent" },
] as const;

export function getCampaignTypeLabel(type: string): string {
  return CAMPAIGN_TYPE_LABELS[type] || type;
}

export function getMetricLabel(key: string): string {
  return METRICS.find((m) => m.key === key)?.label || key;
}

export function getBudgetLabel(budgetType: string): string {
  return budgetType === "DAILY" ? "Daily" : "Total";
}
