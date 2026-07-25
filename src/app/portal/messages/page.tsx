import {redirect}from"next/navigation";
import PortalPage from"@/features/portal/PortalPage";
import{getCustomerPortalContext}from"@/lib/portal/context";
import{listCustomerMessages}from"@/lib/portal/workflows";
import { listPortalCommunicationDeliveries } from "@/lib/communications/center";

export default async function Page(){
  const c=await getCustomerPortalContext();if(!c)redirect("/portal/sign-in");
  const identity={companyId:c.companyId,customerId:c.customerId,portalAccessId:c.portalAccess.id,displayName:[c.customer.firstName,c.customer.lastName].filter(Boolean).join(" ")};
  const[threads,deliveries]=await Promise.all([listCustomerMessages(identity),listPortalCommunicationDeliveries(c.companyId,c.customerId)]);
  return <PortalPage company={c.company}><h1 className="text-3xl font-bold">Messages</h1>
    <div className="mt-5 space-y-4">{deliveries.map(row=><section className="rounded-xl border bg-white p-5" key={row.id}><h2 className="font-bold">{row.subject??"Update"}</h2><p className="mt-2 whitespace-pre-wrap">{row.renderedBody}</p><time className="text-xs text-slate-500">{(row.deliveredAt??row.createdAt).toLocaleString()}</time></section>)}
    {threads.map(thread=><section className="rounded-xl border bg-white p-5" key={thread.id}><h2 className="font-bold">{thread.subject}</h2>{thread.messages.map(message=><div className="mt-3 rounded bg-slate-50 p-3" key={message.id}><p className="text-sm font-semibold">{message.senderDisplayName}</p><p>{message.body}</p><time className="text-xs text-slate-500">{message.createdAt.toLocaleString()}</time></div>)}</section>)}
    {!threads.length&&!deliveries.length&&<p>No messages yet.</p>}</div>
  </PortalPage>
}
