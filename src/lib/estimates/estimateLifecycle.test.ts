import {describe,expect,it,vi} from "vitest";
vi.mock("@/lib/prisma",()=>({prisma:{}}));
import {transitionEstimateInTransaction} from "./estimateLifecycle";
function tx(status="Sent"){return {estimate:{findFirst:vi.fn().mockResolvedValue({id:"e1",status}),update:vi.fn().mockResolvedValue({id:"e1",status:"Viewed"})},estimateTimelineEvent:{create:vi.fn()},estimateActivityFeedItem:{create:vi.fn()},auditEvent:{create:vi.fn()},systemNotification:{create:vi.fn()}}}
describe("lifecycle persistence",()=>{
  it("writes status, timeline, activity, audit, and notification",async()=>{const db=tx();await transitionEstimateInTransaction(db as never,"c1","e1","Viewed",{actor:{label:"Customer"}});expect(db.estimate.update).toHaveBeenCalled();expect(db.estimateTimelineEvent.create).toHaveBeenCalledWith({data:expect.objectContaining({eventType:"Customer Viewed",companyId:"c1",estimateId:"e1"})});expect(db.estimateActivityFeedItem.create).toHaveBeenCalledWith({data:expect.objectContaining({message:"Customer viewed estimate"})});expect(db.auditEvent.create).toHaveBeenCalled();expect(db.systemNotification.create).toHaveBeenCalledWith({data:expect.objectContaining({title:"Estimate Viewed"})})});
  it("rejects invalid transitions without side effects",async()=>{const db=tx("Paid");await expect(transitionEstimateInTransaction(db as never,"c1","e1","Draft")).rejects.toThrow("cannot move");expect(db.estimate.update).not.toHaveBeenCalled();expect(db.auditEvent.create).not.toHaveBeenCalled()});
});
