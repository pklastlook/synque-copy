"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SafeImage — a drop-in `<img>` replacement that gracefully handles broken
 * image URLs by falling back to a placeholder (icon or colored div) instead
 * of showing the browser's broken-image icon.
 *
 * Why: avatar URLs and media URLs can break when:
 *   - The storage provider (Cloudinary) credentials are misconfigured
 *   - The CDN is unreachable / rate-limited
 *   - The URL expired (signed URLs)
 *   - The asset was deleted
 *
 * Usage:
 *   <SafeImage src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full" fallback={< initials />} />
 *   <SafeImage src={post.mediaUrl} alt="" className="h-40 w-full" fallback={<FileIcon/>} />
 */
export function SafeImage({
  src,
  alt,
  className,
  fallback,
  ...props
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  [key: string]: unknown;
}) {
  const [error, setError] = React.useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    // If a custom fallback is provided, render it inside the same className
    // wrapper so dimensions are preserved
    if (fallback) {
      return (
        <div className={cn("flex items-center justify-center", className)}>
          {fallback}
        </div>
      );
    }
    // Default fallback: a muted background div that preserves dimensions
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}
