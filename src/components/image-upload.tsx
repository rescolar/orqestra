"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ImageUploadProps = {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  uploadType: "avatar" | "logo";
  entityId: string;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "square";
};

const SIZE_MAP = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

const ICON_SIZE_MAP = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

export function ImageUpload({
  currentUrl,
  onUploaded,
  uploadType,
  entityId,
  size = "md",
  shape = "circle",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview || currentUrl;

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        setError("Usa JPG, PNG o WebP");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Máximo 2 MB");
        return;
      }

      setError(null);
      setPreview(URL.createObjectURL(file));
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", uploadType);
        formData.append("entityId", entityId);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error al subir imagen");
        }

        const { url } = await res.json();
        onUploaded(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir");
        setPreview(null);
      } finally {
        setUploading(false);
        // Reset input so same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [uploadType, entityId, onUploaded]
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-primary hover:bg-primary/5",
          SIZE_MAP[size],
          shape === "circle" ? "rounded-full" : "rounded-xl"
        )}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt="Avatar"
            fill
            className="object-cover"
            sizes={size === "sm" ? "48px" : size === "md" ? "80px" : "112px"}
          />
        ) : (
          <span
            className={cn(
              "material-symbols-outlined text-gray-400",
              ICON_SIZE_MAP[size]
            )}
          >
            add_a_photo
          </span>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </button>

      {error && <p className="text-xs text-danger">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
