import { getSupabase } from "@/lib/supabase";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type UploadTarget = "avatars" | "logos";

export class UploadService {
  static validateFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Formato no permitido. Usa JPG, PNG o WebP.");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("El archivo es demasiado grande. Máximo 2 MB.");
    }
  }

  static async upload(
    bucket: UploadTarget,
    entityId: string,
    file: File
  ): Promise<string> {
    this.validateFile(file);

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${entityId}.${ext}`;

    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) throw new Error(`Error subiendo imagen: ${error.message}`);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  static async delete(bucket: UploadTarget, entityId: string) {
    // Try removing all possible extensions
    const paths = [`${entityId}.jpg`, `${entityId}.png`, `${entityId}.webp`];
    await getSupabase().storage.from(bucket).remove(paths);
  }
}
