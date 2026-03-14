"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/actions/password-reset";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [confirmError, setConfirmError] = useState("");

  const [state, formAction, pending] = useActionState(
    async (
      _prev: { success?: boolean; error?: string } | undefined,
      formData: FormData
    ) => {
      const password = formData.get("password") as string;
      const confirm = formData.get("confirm") as string;
      if (password !== confirm) {
        setConfirmError("Las contraseñas no coinciden");
        return _prev;
      }
      setConfirmError("");
      formData.set("token", token);
      return await resetPassword(formData);
    },
    undefined
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">
          Ordenaia
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Nueva contraseña
        </p>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Contraseña actualizada correctamente.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm text-primary hover:underline"
            >
              Ir al login
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {(state?.error || confirmError) && (
              <p className="text-sm text-danger text-center">
                {state?.error || confirmError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-light"
              disabled={pending}
            >
              {pending ? "Actualizando..." : "Restablecer contraseña"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
