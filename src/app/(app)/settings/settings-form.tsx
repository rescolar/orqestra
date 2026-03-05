"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/shared/image-upload";
import { updateBranding } from "@/lib/actions/settings";
import { Calendar, MapPin } from "lucide-react";

type BrandingState = {
  avatar_url: string | null;
  brand_name: string;
  brand_welcome_msg: string;
  brand_bg_color: string;
  brand_text_color: string;
};

export function SettingsForm({
  userId,
  initial,
}: {
  userId: string;
  initial: BrandingState;
}) {
  const [state, setState] = useState<BrandingState>(initial);

  const save = (field: keyof Omit<BrandingState, "avatar_url">, value: string) => {
    setState((s) => ({ ...s, [field]: value }));
    updateBranding({ [field]: value || null });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Form */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Logo</Label>
          <ImageUpload
            currentUrl={state.avatar_url}
            onUploaded={(url) => setState((s) => ({ ...s, avatar_url: url }))}
            uploadType="logo"
            entityId={userId}
            size="lg"
            shape="square"
          />
          <p className="text-xs text-muted-foreground">
            Se muestra en la página de invitación
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand_name">Nombre de marca</Label>
          <Input
            id="brand_name"
            placeholder="Ej: Mi Organización"
            value={state.brand_name}
            onChange={(e) => setState((s) => ({ ...s, brand_name: e.target.value }))}
            onBlur={(e) => save("brand_name", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Si está vacío se usa tu nombre de usuario
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand_welcome_msg">Mensaje de bienvenida</Label>
          <Input
            id="brand_welcome_msg"
            placeholder="Ej: Te invita a participar"
            value={state.brand_welcome_msg}
            onChange={(e) =>
              setState((s) => ({ ...s, brand_welcome_msg: e.target.value }))
            }
            onBlur={(e) => save("brand_welcome_msg", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Si está vacío se usa &quot;Te han invitado a unirte&quot;
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand_bg_color">Color de fondo</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="brand_bg_color"
                value={state.brand_bg_color || "#F9FAFB"}
                onChange={(e) =>
                  setState((s) => ({ ...s, brand_bg_color: e.target.value }))
                }
                onBlur={(e) => save("brand_bg_color", e.target.value === "#F9FAFB" ? "" : e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border p-0.5"
              />
              <Input
                value={state.brand_bg_color}
                onChange={(e) =>
                  setState((s) => ({ ...s, brand_bg_color: e.target.value }))
                }
                onBlur={(e) => save("brand_bg_color", e.target.value)}
                placeholder="#F9FAFB"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_text_color">Color de texto</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="brand_text_color"
                value={state.brand_text_color || "#1E4A4A"}
                onChange={(e) =>
                  setState((s) => ({ ...s, brand_text_color: e.target.value }))
                }
                onBlur={(e) => save("brand_text_color", e.target.value === "#1E4A4A" ? "" : e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border p-0.5"
              />
              <Input
                value={state.brand_text_color}
                onChange={(e) =>
                  setState((s) => ({ ...s, brand_text_color: e.target.value }))
                }
                onBlur={(e) => save("brand_text_color", e.target.value)}
                placeholder="#1E4A4A"
                className="font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <Label>Vista previa</Label>
        <div
          className="flex min-h-[400px] items-center justify-center rounded-xl border p-6"
          style={{ backgroundColor: state.brand_bg_color || "#F9FAFB" }}
        >
          <Card className="w-full max-w-sm text-center">
            <CardHeader>
              {state.avatar_url ? (
                <div className="mx-auto mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.avatar_url}
                    alt="Logo"
                    className="mx-auto h-12 w-auto object-contain"
                  />
                </div>
              ) : null}
              <CardTitle
                className="text-2xl font-bold"
                style={{ color: state.brand_text_color || undefined }}
              >
                {state.brand_name || "Orqestra"}
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {state.brand_welcome_msg || "Te han invitado a unirte"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-lg font-semibold text-gray-900">
                  Nombre del evento
                </p>
                <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" />1 ene 2026 – 3 ene 2026
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    Lugar del evento
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Organiza: {state.brand_name || "Tu nombre"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
