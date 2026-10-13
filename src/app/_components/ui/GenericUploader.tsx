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
}

export function GenericUploader({
  onUploadComplete,
  accept = "*/*",
  label = "Upload file"
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
      const { uploadUrl, key, publicUrl } = await getUploadUrl.mutateAsync({
        fileName: file.name.replace(/[^a-zA-Z0-9.-]/g, "_"),
        fileType: file.type,
      });

      // 2. Upload directly to R2
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to upload file");
      }

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
    <div>
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
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full h-auto py-4 border-dashed border-2 flex flex-col gap-2 items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        ) : (
          <Upload className="h-5 w-5" />
        )}
        <span className="text-sm font-medium">
          {isUploading ? "Uploading..." : label}
        </span>
      </Button>
    </div>
  );
}
