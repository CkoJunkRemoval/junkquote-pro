import AppLayout from "@/components/layout/AppLayout";
import {requireOperationalTenant} from "@/lib/auth/tenant";
import {getAccountsReceivableDashboard} from "@/lib/payments/accountsReceivable";
import AccountsReceivableDashboard from "@/features/payments/AccountsReceivableDashboard";
export default async function Page(){const {companyId}=await requireOperationalTenant();return <AppLayout><AccountsReceivableDashboard data={await getAccountsReceivableDashboard(companyId)}/></AppLayout>}
