"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, Upload } from "lucide-react";
import { QuoteAttachment } from "@/domain/types";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 15 * 1024 * 1024;

export function QuoteAttachments({
  quoteId,
  attachments
}: {
  quoteId: string;
  attachments: QuoteAttachment[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Attachments are limited to 15 MB");
      return;
    }

    setUploading(true);
    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, fileName: file.name, contentType: file.type })
      });
      const presign = await presignResponse.json();
      if (!presign.ok) throw new Error(presign.error || "Could not start the upload");

      const putResponse = await fetch(presign.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file
      });
      if (!putResponse.ok) throw new Error("The file upload to storage failed");

      const finalizeResponse = await fetch("/api/uploads/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          storageKey: presign.key,
          fileName: file.name,
          mimeType: file.type,
          size: file.size
        })
      });
      const finalize = await finalizeResponse.json();
      if (!finalize.ok) throw new Error(finalize.error || "Could not save the attachment");

      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-emerald" />
          <h2 className="text-lg font-semibold">Attachments</h2>
          <span className="text-sm text-muted">{attachments.length || "none yet"}</span>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Add photo or PDF"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {error ? <p className="mb-3 rounded-md bg-clay/10 px-3 py-2 text-sm font-semibold text-clay">{error}</p> : null}

      <div className="space-y-2">
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={`/api/uploads/attachment/${attachment.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm hover:bg-canvas"
          >
            <span className="truncate font-semibold">{attachment.fileName}</span>
            <span className="shrink-0 text-muted">{formatBytes(attachment.size)}</span>
          </a>
        ))}
        {attachments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">
            Inspection photos and supporting documents help win the job.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
