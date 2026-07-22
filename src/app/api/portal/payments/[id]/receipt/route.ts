import {NextResponse} from "next/server";
import {requireCustomerPortalContext} from "@/lib/portal/context";
import {getPaymentReceiptData} from "@/lib/payments/listInvoicePayments";
import {renderPaymentReceiptPdf} from "@/data/output/renderPaymentReceiptPdf";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const context=await requireCustomerPortalContext(),{id}=await params;const payment=await getPaymentReceiptData(context.companyId,id);if(!payment||payment.invoice.customerId!==context.customerId)return NextResponse.json({error:"Receipt not found."},{status:404});const base64=await renderPaymentReceiptPdf(payment);return new Response(Buffer.from(base64,"base64"),{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename="receipt-${id}.pdf"`,"cache-control":"private, no-store"}})}catch{return NextResponse.json({error:"Receipt unavailable."},{status:401})}}
