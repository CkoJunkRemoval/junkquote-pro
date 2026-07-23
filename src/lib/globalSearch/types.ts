export type SearchCategory = "Customers" | "Properties" | "Estimates" | "Jobs" | "Invoices" | "Payments" | "Crew" | "Messages";
export type GlobalSearchResult = {
  id: string;
  category: SearchCategory;
  title: string;
  context: string;
  href: string;
};
export type GlobalSearchResponse = {
  query: string;
  groups: Partial<Record<SearchCategory, GlobalSearchResult[]>>;
  total: number;
  historyScope: string;
  recent: boolean;
};
export const searchCategories: SearchCategory[] = ["Customers", "Properties", "Estimates", "Jobs", "Invoices", "Payments", "Crew", "Messages"];
