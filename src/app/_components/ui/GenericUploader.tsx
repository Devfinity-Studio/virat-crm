"use client";

import { useState, useRef } from "react";
import { Upload, X, File, CheckCircle, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface UploadedFile {
  name: string;
  url: string;
  key: string;
  mimeType: string;
  size: number;
}

interface GenericUploaderProps {
  onUploadComplete: (file: UploadedFile) => void;
  accept?: string;
  label?: string;
  className?: string;
}

export function GenericUploader({
  onUploadComplete,
  accept = "*/*",
  label = "Upload file",
  className,
}: GenericUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrl = api.storage.getUploadUrl.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Get presigned URL
      const { url, key } = await getUploadUrl.mutateAsync({
        fileName: file.name.replace(/[^a-zA-Z0-9.-]/g, "_"),
        fileType: file.type,
      });

      // 2. Upload directly to R2
      const res = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to upload file");
      }

      const publicUrl = url.split("?")[0] ?? url;

      // 3. Return the generic file data
      onUploadComplete({
        name: file.name,
        url: publicUrl,
        key: key,
        mimeType: file.type,
        size: file.size,
      });

    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={accept}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 border-dashed border-slate-300 hover:border-slate-400"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            <span className="text-xs">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 text-slate-500" />
            <span className="text-xs">{label}</span>
          </>
        )}
      </Button>
    </div>
  );
}
