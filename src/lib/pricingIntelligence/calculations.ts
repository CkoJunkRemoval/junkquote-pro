export type IntelligenceEstimate={
  id:string;createdAt:Date;status:string;pricingTotal:number;pricingDiscount:number;signedAt:Date|null;
  profile:{id:string;name:string;laborRate:number};property:{zip:string;city:string;serviceArea:string|null};
  customer:{id:string;name:string};employeeName:string;
  items:Array<{name:string;category:string;quantity:number;price:number;laborHours:number;disposalFee:number;missingDisposal:boolean;manuallyEdited:boolean}>;
  rules:Array<{name:string;category:string;amount:number;status:string;manuallyAdjusted:boolean;reason:string|null}>;
  job:null|{id:string;status:string;completedAt:Date|null;scheduledStart:Date|null;crewNames:string[];invoiceTotal:number|null};
  invoice:null|{total:number;issuedDate:Date|null;paidDate:Date|null};
};
export type IntelligencePayment={amount:number;paymentDate:Date};
const sum=(values:number[])=>values.reduce((total,value)=>total+value,0);
const average=(values:number[])=>values.length?sum(values)/values.length:0;
const round=(value:number)=>Math.round(value*100)/100;
const accepted=(estimate:IntelligenceEstimate)=>estimate.status==="Approved"||Boolean(estimate.job);
const days=(from:Date,to:Date)=>Math.max(0,(to.getTime()-from.getTime())/86400000);
const group=<T>(rows:T[],key:(row:T)=>string)=>{const map=new Map<string,T[]>();for(const row of rows){const name=key(row)||"Unknown";map.set(name,[...(map.get(name)??[]),row]);}return map;};

export function calculatePricingIntelligence(estimates:IntelligenceEstimate[],payments:IntelligencePayment[],now=new Date()){
  const approved=estimates.filter(accepted),invoices=estimates.flatMap(estimate=>estimate.invoice?[estimate.invoice]:[]),jobs=estimates.flatMap(estimate=>estimate.job?[{estimate,...estimate.job}]:[]);
  const paidInvoices=invoices.filter(invoice=>invoice.issuedDate&&invoice.paidDate),approvalTimes=estimates.filter(estimate=>estimate.signedAt).map(estimate=>days(estimate.createdAt,estimate.signedAt!));
  const startOfWeek=new Date(now);startOfWeek.setHours(0,0,0,0);startOfWeek.setDate(startOfWeek.getDate()-((startOfWeek.getDay()+6)%7));
  const startOfMonth=new Date(now.getFullYear(),now.getMonth(),1),startOfYear=new Date(now.getFullYear(),0,1);
  const revenueSince=(date:Date)=>sum(payments.filter(payment=>payment.paymentDate>=date&&payment.paymentDate<=now).map(payment=>payment.amount));

  const itemMap=new Map<string,{name:string;category:string;quoted:number;accepted:number;revenue:number;discount:number;labor:number;disposal:number;profit:number;prices:number[]}>();
  for(const estimate of estimates)for(const item of estimate.items){
    const key=`${item.category}\u0000${item.name}`,row=itemMap.get(key)??{name:item.name,category:item.category,quoted:0,accepted:0,revenue:0,discount:0,labor:0,disposal:0,profit:0,prices:[]};
    const itemRevenue=item.price*item.quantity,rowLabor=item.laborHours*item.quantity,rowDisposal=item.disposalFee*item.quantity,totalQuantity=Math.max(1,sum(estimate.items.map(value=>value.quantity)));
    row.quoted+=item.quantity;row.prices.push(item.price);row.labor+=rowLabor;row.disposal+=rowDisposal;row.discount+=estimate.pricingDiscount*(item.quantity/totalQuantity);
    if(accepted(estimate)){row.accepted+=item.quantity;row.revenue+=itemRevenue;row.profit+=itemRevenue-rowDisposal-rowLabor*estimate.profile.laborRate;}itemMap.set(key,row);
  }
  const items=[...itemMap.values()].map(row=>({...row,averageSellingPrice:round(average(row.prices)),averageDiscount:round(row.quoted?row.discount/row.quoted:0),averageLabor:round(row.quoted?row.labor/row.quoted:0),averageDisposalCost:round(row.quoted?row.disposal/row.quoted:0),averageProfitEstimate:round(row.accepted?row.profit/row.accepted:0)})).sort((a,b)=>b.revenue-a.revenue);

  const ruleMap=new Map<string,{name:string;category:string;triggered:number;revenue:number;removed:number;edited:number;values:number[];reasons:Map<string,number>}>();
  for(const estimate of estimates)for(const rule of estimate.rules){const row:NonNullable<ReturnType<typeof ruleMap.get>>=ruleMap.get(rule.name)??{name:rule.name,category:rule.category,triggered:0,revenue:0,removed:0,edited:0,values:[],reasons:new Map<string,number>()};
    if(rule.status==="Applied"){row.triggered++;row.values.push(rule.amount);row.revenue+=Math.max(0,rule.amount);}if(rule.status==="Skipped")row.removed++;if(rule.manuallyAdjusted)row.edited++;
    const reason=rule.reason??"Configured conditions";row.reasons.set(reason,(row.reasons.get(reason)??0)+1);ruleMap.set(rule.name,row);}
  const rules=[...ruleMap.values()].map(row=>({name:row.name,category:row.category,triggered:row.triggered,revenue:row.revenue,removed:row.removed,edited:row.edited,averageValue:round(average(row.values)),mostCommonTrigger:[...row.reasons].sort((a,b)=>b[1]-a[1])[0]?.[0]??"No trigger recorded",removalRate:round((row.triggered+row.removed)?row.removed/(row.triggered+row.removed)*100:0)})).sort((a,b)=>b.revenue-a.revenue);

  const profiles=[...group(estimates,estimate=>estimate.profile.name)].map(([name,rows])=>{const successful=rows.filter(accepted);return{name,estimates:rows.length,averageEstimate:round(average(rows.map(row=>row.pricingTotal))),acceptanceRate:round(rows.length?successful.length/rows.length*100:0),revenue:round(sum(successful.map(row=>row.invoice?.total??row.pricingTotal))),averageJobSize:round(average(successful.map(row=>row.items.reduce((total,item)=>total+item.quantity,0))))};}).sort((a,b)=>b.revenue-a.revenue);
  const serviceAreas=[...group(estimates,estimate=>`${estimate.property.city}, ${estimate.property.zip}`)].map(([name,rows])=>{const completed=rows.filter(row=>row.job?.status==="Completed"),revenue=sum(completed.map(row=>row.invoice?.total??row.pricingTotal));return{name,jobs:completed.length,revenue:round(revenue),averageTicket:round(completed.length?revenue/completed.length:0),averageDriveDistance:null as number|null};}).sort((a,b)=>b.revenue-a.revenue);
  const customers=[...group(estimates,estimate=>estimate.customer.id)].map(([,rows])=>{const completed=rows.filter(row=>row.job?.status==="Completed"),revenue=sum(completed.map(row=>row.invoice?.total??row.pricingTotal));return{id:rows[0].customer.id,name:rows[0].customer.name,jobs:completed.length,lifetimeValue:round(revenue),averageSpend:round(completed.length?revenue/completed.length:0)};}).sort((a,b)=>b.lifetimeValue-a.lifetimeValue);
  const crews=[...group(jobs.flatMap(job=>job.crewNames.map(name=>({name,job}))),row=>row.name)].map(([name,rows])=>{const completed=rows.filter(row=>row.job.status==="Completed"),revenue=sum(completed.map(row=>row.job.invoiceTotal??row.job.estimate.pricingTotal));const durations=completed.filter(row=>row.job.completedAt&&row.job.scheduledStart).map(row=>days(row.job.scheduledStart!,row.job.completedAt!)*24),activeDays=new Set(completed.map(row=>row.job.completedAt?.toISOString().slice(0,10))).size;return{name,jobsCompleted:completed.length,revenueProduced:round(revenue),averageJobValue:round(completed.length?revenue/completed.length:0),averageCompletionTimeHours:round(average(durations)),averageRevenuePerDay:round(activeDays?revenue/activeDays:0)};}).sort((a,b)=>b.revenueProduced-a.revenueProduced);
  const categories=[...group([...itemMap.values()],item=>item.category)].map(([label,rows])=>({label,value:round(sum(rows.map(row=>row.revenue)),)})).sort((a,b)=>b.value-a.value);
  const trend=[...group(estimates,estimate=>estimate.createdAt.toISOString().slice(0,7))].map(([label,rows])=>({label,revenue:round(sum(rows.filter(accepted).map(row=>row.invoice?.total??row.pricingTotal))),estimates:rows.length,acceptance:round(rows.length?rows.filter(accepted).length/rows.length*100:0)})).sort((a,b)=>a.label.localeCompare(b.label));
  const manualOverrides=sum(estimates.map(estimate=>estimate.items.filter(item=>item.manuallyEdited).length));
  const missingDisposal=sum(estimates.map(estimate=>estimate.items.filter(item=>item.missingDisposal).length));
  const health={averageDiscount:round(average(estimates.map(estimate=>estimate.pricingDiscount))),manualOverrides,ruleOverrides:sum(rules.map(rule=>rule.edited)),missingDisposalFees:missingDisposal,frequentlyDisabledRules:rules.filter(rule=>rule.removalRate>=25).slice(0,5),underpricedCategories:categories.slice().sort((a,b)=>a.value-b.value).slice(0,5)};
  const insights:string[]=[];
  const recentBoundary=new Date(now.getTime()-45*86400000),historyBoundary=new Date(now.getTime()-90*86400000);
  for(const [name,rows] of group(estimates.flatMap(estimate=>estimate.items.map(item=>({name:item.name,price:item.price,date:estimate.createdAt}))),row=>row.name)){
    const recent=average(rows.filter(row=>row.date>=recentBoundary).map(row=>row.price)),prior=average(rows.filter(row=>row.date>=historyBoundary&&row.date<recentBoundary).map(row=>row.price));
    if(recent&&prior&&Math.abs((recent-prior)/prior)>=.05){const change=Math.abs((recent-prior)/prior*100);insights.push(`Your average ${name} price has ${recent<prior?"decreased":"increased"} ${change.toFixed(0)}% over the last 90 days.`);break;}
  }
  const removedRule=rules.slice().sort((a,b)=>b.removalRate-a.removalRate)[0];if(removedRule?.removalRate)insights.push(`${removedRule.name} is manually removed on ${removedRule.removalRate.toFixed(0)}% of evaluated estimates.`);
  if(categories[0])insights.push(`${categories[0].label} produces the highest estimated item revenue.`);
  const disposalItem=items.slice().sort((a,b)=>b.averageDisposalCost-a.averageDisposalCost)[0];if(disposalItem?.averageDisposalCost)insights.push(`${disposalItem.name} has the highest average disposal cost at $${disposalItem.averageDisposalCost.toFixed(2)}.`);
  const profile=profiles.slice().sort((a,b)=>b.acceptanceRate-a.acceptanceRate)[0];if(profile?.acceptanceRate)insights.push(`${profile.name} has the highest acceptance rate at ${profile.acceptanceRate.toFixed(1)}%.`);
  const repeatCustomers=customers.filter(customer=>customer.jobs>1);
  return {
    summary:{averageEstimate:round(average(estimates.map(row=>row.pricingTotal))),averageApprovedEstimate:round(average(approved.map(row=>row.pricingTotal))),averageInvoice:round(average(invoices.map(row=>row.total))),averageJobValue:round(average(jobs.map(row=>row.invoiceTotal??row.estimate.pricingTotal))),averageDiscount:health.averageDiscount,acceptanceRate:round(estimates.length?approved.length/estimates.length*100:0),revenueThisWeek:round(revenueSince(startOfWeek)),revenueThisMonth:round(revenueSince(startOfMonth)),revenueThisYear:round(revenueSince(startOfYear)),averageTimeToApprovalDays:round(average(approvalTimes)),averageDaysUntilPayment:round(average(paidInvoices.map(invoice=>days(invoice.issuedDate!,invoice.paidDate!))))},
    items,rules,profiles,serviceAreas,customers:{repeatCustomers:repeatCustomers.length,averageLifetimeValue:round(average(customers.map(row=>row.lifetimeValue))),highestValue:customers.slice(0,10),mostJobs:customers.slice().sort((a,b)=>b.jobs-a.jobs).slice(0,10)},crews,health,insights,
    charts:{revenueTrend:trend.map(row=>({label:row.label,value:row.revenue})),estimateTrend:trend.map(row=>({label:row.label,value:row.estimates})),acceptanceTrend:trend.map(row=>({label:row.label,value:row.acceptance})),topItems:items.slice(0,10).map(row=>({label:row.name,value:row.revenue})),topRules:rules.slice(0,10).map(row=>({label:row.name,value:row.revenue})),revenueByCategory:categories,revenueByProfile:profiles.map(row=>({label:row.name,value:row.revenue}))},
    meta:{estimateCount:estimates.length,truncated:estimates.length>=5000},
  };
}
