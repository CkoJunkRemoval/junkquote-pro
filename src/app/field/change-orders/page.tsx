import AppLayout from "@/components/layout/AppLayout";
import {requireTenantContext} from "@/lib/auth/tenant";
import {getManagerChangeOrders,resolveFieldActor} from "@/lib/fieldOperations/fieldOperations";
import ManagerChangeOrders from "@/features/field/ManagerChangeOrders";
export default async function ChangeOrdersPage(){const tenant=await requireTenantContext();const actor=await resolveFieldActor(tenant);const orders=await getManagerChangeOrders(tenant.companyId,actor);return <AppLayout><ManagerChangeOrders initialOrders={orders}/></AppLayout>}
