"use client";
/* eslint-disable @next/next/no-img-element -- local object URLs cannot use the Next image optimizer */

import { LoaderCircle, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CompanyLogo } from "@/components/company/CompanyLogo";
import Button from "@/components/ui/Button";

export function openLogoFilePicker(input: Pick<HTMLInputElement, "click"> | null) {
  input?.click();
}

export function nextRemoveConfirmationState(
  current: boolean,
  action: "request" | "cancel" | "removed",
) {
  if (action === "request") return true;
  if (action === "cancel" || action === "removed") return false;
  return current;
}

type Props = {
  companyName: string;
  currentLogoUrl: string | null;
  selectedFile: File | null;
  previewUrl: string | null;
  busy: boolean;
  onFileChange: (file: File | null) => void;
  onSave: () => void;
  onRemove: () => Promise<boolean>;
};

export default function LogoUploadControl({
  companyName,
  currentLogoUrl,
  selectedFile,
  previewUrl,
  busy,
  onFileChange,
  onSave,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    if (!selectedFile && inputRef.current) inputRef.current.value = "";
  }, [selectedFile]);

  async function confirmRemove() {
    if (await onRemove()) {
      setConfirmingRemove((current) =>
        nextRemoveConfirmationState(current, "removed"),
      );
    }
  }

  return (
    <div
      data-testid="logo-upload-control"
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center"
    >
      <div className="shrink-0">
        {previewUrl ? (
          <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img
              src={previewUrl}
              alt={`Selected logo preview for ${companyName}`}
              className="h-full w-full object-contain"
            />
          </span>
        ) : (
          <CompanyLogo
            src={currentLogoUrl}
            companyName={companyName}
            size={80}
            fallbackClassName="rounded-xl"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <input
          ref={inputRef}
          id="company-logo-file"
          data-testid="company-logo-file"
          className="sr-only"
          type="file"
          aria-label="Company logo file"
          aria-describedby="company-logo-help company-logo-selection"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            disabled={busy}
            aria-label="Choose company logo"
            onClick={() => openLogoFilePicker(inputRef.current)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
          >
            <Upload aria-hidden="true" size={18} />
            Choose logo
          </Button>
          {selectedFile && (
            <Button
              type="button"
              disabled={busy}
              onClick={onSave}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
            >
              {busy && (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin"
                  size={18}
                />
              )}
              {busy ? "Uploading…" : "Save logo"}
            </Button>
          )}
        </div>

        <p
          id="company-logo-selection"
          className="mt-2 break-words text-sm text-slate-700"
          aria-live="polite"
        >
          {selectedFile ? selectedFile.name : "No new file selected"}
        </p>
        <p id="company-logo-help" className="mt-1 text-xs text-slate-500">
          JPEG, PNG, or WebP up to 2 MB
        </p>

        {currentLogoUrl && !confirmingRemove && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              setConfirmingRemove((current) =>
                nextRemoveConfirmationState(current, "request"),
              )
            }
            className="mt-3 min-h-11 rounded-xl border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove logo
          </button>
        )}
        {currentLogoUrl && confirmingRemove && (
          <div
            role="group"
            aria-label="Confirm logo removal"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3"
          >
            <p className="text-sm font-medium text-red-900">
              Remove the current company logo?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setConfirmingRemove((current) =>
                    nextRemoveConfirmationState(current, "cancel"),
                  )
                }
                className="min-h-11 rounded-xl border bg-white px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmRemove()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-700 bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && (
                  <LoaderCircle
                    aria-hidden="true"
                    className="animate-spin"
                    size={18}
                  />
                )}
                {busy ? "Removing…" : "Confirm remove"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
