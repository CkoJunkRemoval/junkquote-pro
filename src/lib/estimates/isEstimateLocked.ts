import { ESTIMATE_READ_ONLY_MESSAGE, isEstimateEditable } from "./lifecyclePolicy";
export { isEstimateEditable } from "./lifecyclePolicy";
export function isEstimateLocked(estimate:{status:string; signedAt?:Date|string|null}) { return !isEstimateEditable(estimate); }
export const ESTIMATE_LOCKED_MESSAGE = ESTIMATE_READ_ONLY_MESSAGE;
