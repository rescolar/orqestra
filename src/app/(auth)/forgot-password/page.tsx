"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/actions/password-reset";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const avatarUrl = searchParams.get("avatar");
  const brandName = searchParams.get("name");
  const brandColor = searchParams.get("color");

  const [state, formAction, pending] = useActionState(
    async (
      _prev: { success?: boolean; error?: string } | undefined,
      formData: FormData
    ) => {
      return await requestPasswordReset(formData);
    },
    undefined
  );

  return (
    <Card>
      <CardHeader className="text-center">
        {avatarUrl && (
          <div className="mx-auto mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={brandName || "Logo"}
              className="mx-auto h-12 w-auto object-contain"
            />
          </div>
        )}
        <CardTitle
          className="text-2xl font-bold text-primary"
          style={{ color: brandColor || undefined }}
        >
          {brandName || "Orqestra"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recuperar contraseña
        </p>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Si existe una cuenta con ese email, recibirás un enlace para
              restablecer tu contraseña.
            </p>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Volver al login
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <p className="text-sm text-danger text-center">{state.error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-light"
              disabled={pending}
            >
              {pending ? "Enviando..." : "Enviar enlace"}
            </Button>
            <p className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Volver al login
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
