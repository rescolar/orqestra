"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyProfile } from "@/lib/actions/participant";
import { ImageUpload } from "@/components/shared/image-upload";

const DIETARY_OPTIONS = [
  "Vegetariano",
  "Vegano",
  "Sin gluten",
  "Sin lactosa",
  "Halal",
  "Kosher",
];

const GENDER_OPTIONS = [
  { value: "female" as const, label: "Mujer" },
  { value: "male" as const, label: "Hombre" },
  { value: "other" as const, label: "Otro" },
  { value: "unknown" as const, label: "Prefiero no decir" },
];

type PersonData = {
  id: string;
  name_full: string;
  gender: string;
  contact_email: string | null;
  contact_phone: string | null;
  dietary_requirements: string[];
  allergies_text: string | null;
  avatar_url: string | null;
  discoverable: boolean;
};

export function MyProfileForm({ person }: { person: PersonData }) {
  const [name, setName] = useState(person.name_full);
  const [gender, setGender] = useState(person.gender);
  const [email, setEmail] = useState(person.contact_email ?? "");
  const [phone, setPhone] = useState(person.contact_phone ?? "");
  const [dietary, setDietary] = useState<string[]>(
    person.dietary_requirements
  );
  const [allergies, setAllergies] = useState(person.allergies_text ?? "");
  const [avatarUrl, setAvatarUrl] = useState(person.avatar_url);
  const [discoverable, setDiscoverable] = useState(person.discoverable);
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (data: Parameters<typeof updateMyProfile>[0]) => {
      setSaving(true);
      await updateMyProfile(data);
      setSaving(false);
    },
    []
  );

  const handleNameBlur = () => {
    if (name && name !== person.name_full) {
      save({ name_full: name });
    }
  };

  const handleGenderChange = (value: "unknown" | "female" | "male" | "other") => {
    setGender(value);
    save({ gender: value });
  };

  const handleEmailBlur = () => {
    if (email !== (person.contact_email ?? "")) {
      save({ contact_email: email || undefined });
    }
  };

  const handlePhoneBlur = () => {
    if (phone !== (person.contact_phone ?? "")) {
      save({ contact_phone: phone || undefined });
    }
  };

  const handleDietaryToggle = (option: string) => {
    const next = dietary.includes(option)
      ? dietary.filter((d) => d !== option)
      : [...dietary, option];
    setDietary(next);
    save({ dietary_requirements: next });
  };

  const handleAllergiesBlur = () => {
    if (allergies !== (person.allergies_text ?? "")) {
      save({ allergies_text: allergies || null });
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6">
          <ImageUpload
            currentUrl={avatarUrl}
            onUploaded={setAvatarUrl}
            uploadType="avatar"
            entityId={person.id}
            size="lg"
            shape="circle"
          />
          <p className="text-xs text-muted-foreground">Toca para cambiar tu foto</p>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
            />
          </div>

          <div className="space-y-2">
            <Label>Género</Label>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleGenderChange(value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    gender === value
                      ? "border-primary bg-primary text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handlePhoneBlur}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dietary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dieta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleDietaryToggle(option)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  dietary.includes(option)
                    ? "border-amber-500 bg-amber-100 text-amber-800"
                    : "border-gray-300 bg-white text-gray-700 hover:border-amber-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alergias</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full rounded-lg border bg-white p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            placeholder="Describe tus alergias alimentarias..."
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            onBlur={handleAllergiesBlur}
          />
        </CardContent>
      </Card>

      {/* Discoverable */}
      <Card>
        <CardContent className="pt-6">
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Visible para otros participantes</span>
              <p className="text-xs text-muted-foreground">
                {discoverable
                  ? "Otros participantes pueden ver tu nombre en los eventos."
                  : "Tu nombre no aparecerá en la lista de participantes."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={discoverable}
              onClick={() => {
                const next = !discoverable;
                setDiscoverable(next);
                save({ discoverable: next });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                discoverable ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                  discoverable ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        </CardContent>
      </Card>

      {saving && (
        <p className="text-center text-xs text-muted-foreground">
          Guardando...
        </p>
      )}
    </div>
  );
}
