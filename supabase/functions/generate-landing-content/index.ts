import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const FAIR_HOUSING_SYSTEM_PROMPT = `You are writing content for an HOA (Homeowners Association) community website. All content you generate MUST comply with the Fair Housing Act (FHA) and all applicable fair housing laws.

MANDATORY RULES:
- Never reference or imply preferences regarding race, color, religion, national origin, sex, familial status, disability, sexual orientation, gender identity, or any other protected class.
- Never use language that could be interpreted as steering, exclusion, or preference for any group of people.
- Do not describe the community in terms of the type of people who live there (e.g., avoid "perfect for young professionals," "family-oriented neighborhood," "quiet community for retirees," "Christian community").
- Focus on physical features, amenities, location, and community governance, not the demographics or lifestyle of residents.
- Do not use words like "exclusive," "prestigious," "select," or "private" when describing who can live there.
- Use inclusive, neutral language that welcomes all people equally.
- Avoid gendered language (use "residents" or "homeowners," not "wives," "husbands," etc.).
- Do not mention proximity to churches, synagogues, mosques, or other religious institutions.
- Do not describe the neighborhood using coded language that implies racial or ethnic composition (e.g., "traditional," "up-and-coming," "urban," "suburban feel").

These rules are legally required. Violations expose the HOA to federal lawsuits and penalties.`;

const FIELD_PROMPTS: Record<string, string> = {
  hero_headline:
    "Write a welcoming headline (max 8 words) for the hero banner of an HOA community landing page. Focus on the community as a place, not its people. No quotes.",
  hero_subheadline:
    "Write a short subheadline (1 sentence, max 20 words) for the hero banner. Focus on the neighborhood and what the HOA provides, not who lives there. No quotes.",
  about_title:
    'Write a short section title (2-4 words) for the "About" section of an HOA community page. No quotes.',
  about_body:
    "Write 2-3 short paragraphs (total ~80 words) describing this HOA community. Focus on the neighborhood's physical features, amenities, location, and how the association maintains and improves the community. Do not describe or characterize the residents. Keep it warm and genuine, not corporate. No quotes around the whole text.",
  contact_title:
    'Write a short section title (2-4 words) for the "Contact" section. No quotes.',
  contact_body:
    "Write 1-2 sentences of contact section text for an HOA, mentioning availability for questions or concerns. Keep it welcoming and inclusive. No quotes.",
  board_members_title:
    "Write a short section title (2-4 words) for the board members section. No quotes.",
  amenities_title:
    "Write a short section title (2-4 words) for the amenities section. No quotes.",
  announcements_title:
    "Write a short section title (2-4 words) for the announcements/updates section. No quotes.",
  footer_text:
    "Write a short footer line (max 15 words) including a copyright notice for the current year. No quotes.",
  faq: 'Generate 3 common FAQ items for an HOA community website. Return as JSON array: [{"question":"...","answer":"..."}]. Questions should cover dues/assessments, amenity reservations, and board meetings. Keep answers concise (1-2 sentences each), factual, and free of any language that could imply preferences about who should live in the community. Return ONLY valid JSON, no markdown.',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check board membership (limit+maybeSingle to handle multi-community members)
    const { data: memberData } = await supabase
      .from("members")
      .select("system_role")
      .eq("user_id", user.id)
      .in("system_role", ["board", "manager", "super_admin"])
      .eq("is_approved", true)
      .limit(1)
      .maybeSingle();

    if (!memberData) {
      return new Response(
        JSON.stringify({ error: "Only board members can use this feature" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "AI generation is not configured. Please set the ANTHROPIC_API_KEY secret.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const { field, communityName } = body;

    if (!field || !communityName) {
      return new Response(
        JSON.stringify({ error: "Missing field or communityName" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const fieldPrompt = FIELD_PROMPTS[field];
    if (!fieldPrompt) {
      return new Response(
        JSON.stringify({ error: `Unknown field: ${field}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          system: FAIR_HOUSING_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Community name: "${communityName}"\n\n${fieldPrompt}`,
            },
          ],
        }),
      },
    );

    if (!claudeResponse.ok) {
      const errorBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errorBody);
      return new Response(
        JSON.stringify({ error: "AI generation failed. Please try again." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const claudeData = await claudeResponse.json();
    const textContent = claudeData.content?.[0]?.text;

    return new Response(JSON.stringify({ text: textContent?.trim() ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
