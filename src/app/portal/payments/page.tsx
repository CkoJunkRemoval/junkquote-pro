import {redirect} from "next/navigation";
import PortalPage from "@/features/portal/PortalPage";
import {getCustomerPortalContext} from "@/lib/portal/context";
import {listPortalPayments} from "@/lib/portal/data";
const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
export default async function Page(){const context=await getCustomerPortalContext();if(!context)redirect("/portal/sign-in");const rows=await listPortalPayments(context.companyId,context.customerId);return <PortalPage company={context.company}><h1 className="text-3xl font-bold">Payments</h1><div className="mt-5 space-y-3">{rows.map(payment=><section className="rounded-xl border bg-white p-5" key={payment.id}><b>{money(payment.amount)} · {payment.method}</b><p>{payment.paymentDate.toLocaleDateString()} · {payment.invoice.displayNumber??"Invoice"}</p>{payment.refunds.map(refund=><p className="text-amber-700" key={refund.id}>Refund: {money(refund.amount)}</p>)}<a className="mt-3 inline-block underline" href={`/api/portal/payments/${payment.id}/receipt`}>Download receipt PDF</a></section>)}{!rows.length&&<p>No payments yet.</p>}</div></PortalPage>}
