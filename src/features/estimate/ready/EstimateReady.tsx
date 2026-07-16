"use client";

import { useState } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { buildEstimatePackage } from "@/data/output/buildEstimatePackage";
import { buildEstimatePdf } from "@/data/output/buildEstimatePdf";
import { generateEstimatePdf } from "@/data/output/generateEstimatePdf";
import { statusTransitions } from "@/lib/estimates/statusWorkflow";
import {
  prepareEstimateDeliveryAction,
} from "@/app/actions/estimates/prepareEstimateDelivery";
import type { EstimateDeliveryMethod } from "@/lib/estimates/prepareEstimateDelivery";
import { signEstimateOnTeamDeviceAction } from "@/app/actions/estimates/signEstimateOnTeamDevice";
import SignaturePad from "@/components/estimate/SignaturePad";

import { useEstimate } from "../EstimateContext";
import { EstimateStatus } from "../status";

export default function EstimateReady() {
  const { estimate, estimateId, setStatus, setEstimate } = useEstimate();
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isPreparingDelivery, setIsPreparingDelivery] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [showTeamSignature, setShowTeamSignature] = useState(false);
  const [teamSignerName, setTeamSignerName] = useState("");
  const [teamSignature, setTeamSignature] = useState("");
  const [teamSignatureError, setTeamSignatureError] = useState<string | null>(null);
  const estimatePackage = buildEstimatePackage(estimate);
  const availableTransitions = statusTransitions[estimate.status];

  async function changeStatus(nextStatus: EstimateStatus) {
    setIsSavingStatus(true);
    setStatusError(null);

    try {
      await setStatus(nextStatus);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to update estimate status."
      );
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function prepareDelivery(method: EstimateDeliveryMethod) {
    if (!estimateId) {
      setDeliveryError("Estimate must be saved before preparing delivery.");
      return null;
    }

    setIsPreparingDelivery(true);
    setDeliveryError(null);
    setDeliveryMessage(null);

    try {
      const delivery = await prepareEstimateDeliveryAction(estimateId, method);
      setApprovalUrl(delivery.approvalUrl);
      return delivery.approvalUrl;
    } catch (error) {
      setDeliveryError(
        error instanceof Error ? error.message : "Unable to prepare estimate delivery."
      );
      return null;
    } finally {
      setIsPreparingDelivery(false);
    }
  }

  async function copyApprovalLink() {
    const url = await prepareDelivery("link");

    if (!url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setDeliveryMessage("Approval link copied to the clipboard.");
    } catch {
      setDeliveryMessage("Approval link generated. Copy it from the field below.");
    }
  }

  async function signOnTeamDevice() {
    if (!estimateId) return;
    setIsSavingStatus(true); setTeamSignatureError(null);
    try { await signEstimateOnTeamDeviceAction(estimateId, teamSignerName, teamSignature); setEstimate((current) => ({ ...current, status: EstimateStatus.Approved })); setShowTeamSignature(false); }
    catch (error) { setTeamSignatureError(error instanceof Error ? error.message : "Unable to save signature."); }
    finally { setIsSavingStatus(false); }
  }

  return (
    <div className="space-y-8">
      <Card>
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold">Estimate Workflow</h1>
            <p className="mt-2 text-slate-500">
              Advance this estimate when it reaches the next stage.
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-6">
            <div className="text-sm text-slate-500">Estimate Number</div>
            <div className="mt-2 text-2xl font-bold">{estimatePackage.estimateNumber}</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
            <div className="text-sm font-medium uppercase tracking-wide text-slate-600">
              Current Status
            </div>
            <div className="mt-2 text-3xl font-bold text-blue-800">
              {estimate.status}
            </div>
          </div>

          <div className="rounded-xl border p-6">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="font-medium">
                  {estimate.customer.firstName} {estimate.customer.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Property</span>
                <span className="font-medium">{estimate.property.address}</span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="text-xl font-bold text-blue-700">
                  ${estimatePackage.pricing.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-bold">Status Controls</h2>
            {availableTransitions.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {availableTransitions.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    disabled={isSavingStatus}
                    onClick={() => void changeStatus(status as EstimateStatus)}
                  >
                    {isSavingStatus ? "Saving..." : `Mark ${status}`}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No further status transitions are available.</p>
            )}
            {statusError && <p className="mt-3 text-red-600">{statusError}</p>}
          </div>

          {estimate.status === EstimateStatus.Ready && (
            <div className="rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold">Delivery</h2>
              <p className="mt-1 text-slate-500">
                Prepare a customer approval link. Email and SMS provider delivery are not connected yet.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={isPreparingDelivery}
                  onClick={() => void prepareDelivery("email").then((url) => {
                    if (url) setDeliveryMessage("Email delivery is not connected yet. Share the generated link manually.");
                  })}
                >
                  Send by Email
                </Button>
                <Button
                  type="button"
                  disabled={isPreparingDelivery}
                  onClick={() => void prepareDelivery("sms").then((url) => {
                    if (url) setDeliveryMessage("Text delivery is not connected yet. Share the generated link manually.");
                  })}
                >
                  Send by Text
                </Button>
                <Button type="button" disabled={isPreparingDelivery} onClick={() => void copyApprovalLink()}>
                  Copy Approval Link
                </Button>
                <Button
                  type="button"
                  disabled={isPreparingDelivery}
                  onClick={() => setShowTeamSignature(true)}
                >
                  Sign on This Device
                </Button>
              </div>

              {approvalUrl && (
                <input
                  readOnly
                  value={approvalUrl}
                  aria-label="Approval link"
                  className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm"
                />
              )}
              {deliveryMessage && <p className="mt-3 text-sm text-slate-600">{deliveryMessage}</p>}
              {deliveryError && <p className="mt-3 text-sm text-red-600">{deliveryError}</p>}
            </div>
          )}

          {estimate.status === EstimateStatus.Sent && (
            <div className="rounded-xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold">Team Device Approval</h2>
              <p className="mt-1 text-slate-500">Capture the customer signature on this device.</p>
              <Button type="button" className="mt-4" onClick={() => setShowTeamSignature(true)}>
                Sign on This Device
              </Button>
            </div>
          )}

          {(estimate.status === EstimateStatus.Ready || estimate.status === EstimateStatus.Sent) && showTeamSignature && (
            <div className="rounded-xl border border-slate-200 p-6"><h2 className="text-xl font-bold">Sign on This Device</h2><input value={teamSignerName} onChange={(event) => setTeamSignerName(event.target.value)} placeholder="Signer full name" className="mt-4 w-full rounded-lg border p-3" /><div className="mt-4"><SignaturePad onChange={setTeamSignature} /></div><div className="mt-4 flex gap-3"><Button type="button" disabled={isSavingStatus} onClick={() => void signOnTeamDevice()}>Save Signature</Button><Button type="button" disabled={isSavingStatus} onClick={() => setShowTeamSignature(false)}>Cancel</Button></div>{teamSignatureError && <p className="mt-3 text-red-600">{teamSignatureError}</p>}</div>
          )}

          <Button type="button" onClick={() => generateEstimatePdf(buildEstimatePdf(estimatePackage))}>
            Download PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
