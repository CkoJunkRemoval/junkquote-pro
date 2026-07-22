"use server";
import {requireOperationalTenant} from "@/lib/auth/tenant";
import {buildPaymentCsv} from "@/lib/payments/accountingExports";
import {configureArReminder} from "@/lib/payments/arReminders";
export async function exportPaymentsAction(from:string,to:string,quickBooks=false){const {companyId}=await requireOperationalTenant();return buildPaymentCsv(companyId,new Date(from),new Date(to),quickBooks)}
export async function configureArReminderAction(input:{name:string;daysOffset:number;subject:string;body:string;enabled?:boolean}){const {companyId}=await requireOperationalTenant();return configureArReminder(companyId,input)}
