import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image) throw new Error("Image data missing");

    const token = Deno.env.get("IMGCHEST_TOKEN");
    if (!token) throw new Error("IMGCHEST_TOKEN env var not set on Supabase");

    const fetchResponse = await fetch(`data:image/jpeg;base64,${image}`);
    const blob = await fetchResponse.blob();

    const formData = new FormData();
    formData.append("images[]", blob, "upload.jpg");
    formData.append("privacy", "hidden");

    const response = await fetch("https://api.imgchest.com/v1/post", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error("ImgChest Upload Failed: " + responseText);
    }

    let payload: any;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new Error("ImgChest returned non-JSON: " + responseText);
    }

    const link = payload?.data?.images?.[0]?.link;
    if (!link)
      throw new Error("ImgChest response missing image link: " + responseText);

    return new Response(JSON.stringify({ url: link }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
