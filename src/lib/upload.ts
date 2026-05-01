import { createClient } from "@/lib/supabase/client";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:image/...;base64,"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image trop lourde (max 10 Mo)");
  }

  const base64 = await fileToBase64(file);
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<{
    url?: string;
    error?: string;
  }>("upload-image", {
    body: { image: base64 },
  });

  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error(data?.error ?? "Réponse invalide");
  return data.url;
}
