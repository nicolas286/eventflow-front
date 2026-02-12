import { useRef } from "react";
import Button from "../button/Button";

export type AssetUploaderProps = {
  label: string;
  hint?: string;

  // Affichage
  valueUrl?: string;
  previewUrl?: string;
  emptyText?: string;

  // Validation
  accept?: string;         
  maxBytes?: number;
  maxLabel?: string;

  variant?: "logo" | "banner";

  // Callbacks
  onPickFile: (file: File) => void;
  onClear: () => void;
  onError?: (message: string) => void;
};

export function AssetUploader({
  label,
  hint,
  valueUrl,
  previewUrl,
  emptyText = "Aucun fichier",
  accept = "image/*",
  maxBytes,
  maxLabel,
  variant,
  onPickFile,
  onClear,
  onError,
}: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className="brandingPanel__asset">
      <div className="brandingPanel__assetHead">
        <div>
          <div className="brandingPanel__label">{label}</div>
          {hint ? <div className="brandingPanel__hint">{hint}</div> : null}
        </div>

        <div className="brandingPanel__assetActions">
          <Button
            variant="secondary"
            label={valueUrl ? "Remplacer" : "Choisir un fichier"}
            onClick={openPicker}
          />
          {valueUrl ? (
            <Button variant="ghost" label="Retirer" onClick={onClear} />
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        className="brandingPanel__fileInput"
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          if (typeof maxBytes === "number" && file.size > maxBytes) {
            const msg = `${label} trop lourd (max ${
              maxLabel ?? `${Math.round(maxBytes / 1024 / 1024)}MB`
            })`;

            onError?.(msg);
            e.currentTarget.value = "";
            return;
          }

          onPickFile(file);
          e.currentTarget.value = ""; 
        }}
      />

      <div className="brandingPanel__thumbRow">
        <div className={[
            "brandingPanel__thumb",
            variant ? `brandingPanel__thumb--${variant}` : "",
        ]
            .filter(Boolean)
            .join(" ")}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="brandingPanel__thumbImg"
            />
          ) : (
            <div className="brandingPanel__thumbEmpty">{emptyText}</div>
          )}
        </div>

        <div className="brandingPanel__thumbMeta">
          <div className="brandingPanel__metaTitle">
            {valueUrl ? "Actuel" : "Aucun"}
          </div>
        </div>
      </div>
    </div>
  );
}
