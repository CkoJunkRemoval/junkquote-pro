export type ProfitInputs={revenue:number;laborCost:number;fuelEstimate:number;disposalCost:number;dumpFees:number;processingFees:number};
export function calculateProfitability(x:ProfitInputs){const costs=x.laborCost+x.fuelEstimate+x.disposalCost+x.dumpFees+x.processingFees;const netProfit=x.revenue-costs;return{...x,costs,netProfit,profitMargin:x.revenue>0?netProfit/x.revenue*100:0};}
export function percentage(numerator:number,denominator:number){return denominator>0?numerator/denominator*100:0;}
