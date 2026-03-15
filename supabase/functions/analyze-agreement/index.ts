import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_VARIABLE_DESCRIPTIONS = `
System variables (auto-filled from the reservation system, do NOT create questions for these):
- {{member_name}} - The member's full legal name (the lessee/renter)
- {{unit_number}} - The member's unit or property number
- {{community_name}} - The HOA community name (the association/lessor)
- {{community_address}} - The community's physical address
- {{amenity_name}} - The name of the amenity being reserved (e.g. Clubhouse)
- {{reservation_date}} - The date of the reservation (formatted like "March 15, 2026")
- {{start_time}} - The start time of the reservation (formatted like "2:00 PM")
- {{end_time}} - The end time of the reservation (formatted like "11:59 PM")
- {{fee}} - The rental fee amount (formatted like "$250.00")
- {{deposit}} - The security deposit amount (formatted like "$500.00")
- {{guest_count}} - The number of expected guests
- {{purpose}} - The purpose/reason for the reservation
- {{signing_date}} - Today's date when the agreement is being signed
`.trim();

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Verify the user is a board member
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

    // Parse request body
    const body = await req.json();
    const { agreement_text, refinement } = body;

    // Validate: must have either agreement_text (initial) or refinement (follow-up)
    const isRefinement = refinement && typeof refinement === "object" && refinement.instruction;
    if (!isRefinement && (!agreement_text || typeof agreement_text !== "string")) {
      return new Response(
        JSON.stringify({ error: "agreement_text or refinement is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "AI analysis is not configured. Please set the ANTHROPIC_API_KEY secret.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Build the prompt based on mode
    let userPrompt: string;

    if (isRefinement) {
      // Refinement mode: admin is asking the AI to adjust the existing template/fields
      const fieldsJson = JSON.stringify(refinement.current_fields ?? [], null, 2);
      userPrompt = `You are helping an admin refine a rental agreement template for an HOA community portal.

Here is the current agreement template (with {{placeholder}} variables):
---
${refinement.current_template ?? ""}
---

Here are the current custom questions that get asked to the member during reservation:
${fieldsJson}

${SYSTEM_VARIABLE_DESCRIPTIONS}

The admin has requested this change:
"${refinement.instruction}"

Apply the requested change to the template and/or fields. Common requests include:
- Removing a custom question (delete from fields array and replace its {{placeholder}} with a system variable or remove it)
- Changing a field type (e.g., text to yes_no)
- Adding new questions
- Rewording questions
- Adjusting the template text

Return a JSON object with exactly this structure:
{
  "template": "The updated agreement template with {{placeholders}}",
  "fields": [updated array of custom question objects],
  "summary": "Brief description of what you changed"
}

Each field object must have: id (UUID string), key (lowercase_underscore), label (question text), type (text|number|yes_no|select|date), required (boolean), fill_phase ("reservation" or "post_event"). Include "options" array only for select type.

fill_phase rules:
- "reservation" = filled by the member when they book the reservation (default)
- "post_event" = filled by a board member after the event (inspection checklist items, board member signatures, post-inspection notes, damage assessment, deposit return decisions, condition reports)
- If a field is about post-rental inspection, board-only actions, or things that happen after the event, set fill_phase to "post_event"
- When in doubt, default to "reservation"

Keep any existing field IDs unchanged if the field still exists. Generate new UUIDs only for new fields.

Return ONLY the JSON object, no markdown code fences, no extra text.`;
    } else {
      // Initial analysis mode: analyze the raw agreement text
      userPrompt = `You are analyzing a rental/lease agreement for an HOA community portal. Your job is to:

1. Read the agreement text below carefully.
2. Identify ALL fill-in-the-blank fields. These are indicated by:
   - Underlines or blank lines (_____, __________)
   - Explicitly variable content (dates that change per reservation, names, amounts)
   - Fields that would be different for each reservation
3. For each blank, determine if it matches a SYSTEM VARIABLE (auto-filled from the reservation system) or needs a CUSTOM QUESTION asked to the member.

${SYSTEM_VARIABLE_DESCRIPTIONS}

For any blank that does NOT match a system variable, create a custom question. Examples of custom questions:
- "Will alcohol be served at the event?" (yes_no type)
- "Name of caterer or catering company" (text type)
- "Type of event" (select type with options like "Birthday Party", "Wedding", "Meeting", etc.)

IMPORTANT RULES:
- Replace ALL blanks with {{placeholders}}, not just some
- Use the exact system variable keys listed above when they match
- For custom questions, use lowercase_underscore keys (e.g., {{alcohol_served}}, {{caterer_name}})
- Keep ALL the original agreement text intact, just replace the blanks
- If the agreement references the association name, community address, fee amounts, or deposit amounts, those are system variables
- Dates formatted as "the ___ day of _____, 20___" should be replaced with the appropriate date system variable

Return a JSON object with exactly this structure:
{
  "template": "The full agreement text with {{placeholders}} replacing all blanks",
  "fields": [
    {
      "id": "unique-uuid-string",
      "key": "variable_key",
      "label": "Question to display to the member",
      "type": "text|number|yes_no|select|date",
      "required": true/false,
      "options": ["option1", "option2"],
      "placeholder": "Optional input placeholder text",
      "fill_phase": "reservation"
    }
  ],
  "summary": "Brief 1-2 sentence description of what was found"
}

Only include "options" array for fields with type "select".
Generate a unique UUID for each field's "id".

fill_phase must be either "reservation" or "post_event":
- "reservation" (default): filled by the member when they make the reservation
- "post_event": filled by a board member after the event has occurred
Set fill_phase to "post_event" for fields related to:
  - Post-rental or post-event inspection items and checklists
  - Board member signatures or names on inspection sections
  - Damage assessment, condition reports, or cleaning status
  - Deposit return decisions (full refund, partial, forfeited)
  - Any field that logically cannot be answered until after the event
When in doubt, default to "reservation".

Here is the rental agreement text to analyze:

---
${agreement_text}
---

Return ONLY the JSON object, no markdown code fences, no extra text.`;
    }

    // Call Claude API
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
          model: "claude-sonnet-4-20250514",
          max_tokens: 16384,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        }),
      },
    );

    if (!claudeResponse.ok) {
      const errorBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errorBody);
      return new Response(
        JSON.stringify({
          error: "AI analysis failed. Please try again.",
          details: claudeResponse.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const claudeData = await claudeResponse.json();
    const textContent = claudeData.content?.[0]?.text;

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: "AI returned an empty response." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse the JSON response from Claude
    let parsed;
    try {
      // Strip potential markdown code fences just in case
      const cleaned = textContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude response:", textContent);
      return new Response(
        JSON.stringify({
          error: "AI returned an invalid response. Please try again.",
          raw: textContent.substring(0, 500),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate the response structure
    if (!parsed.template || !Array.isArray(parsed.fields)) {
      console.error("AI response missing required fields. Keys:", Object.keys(parsed), "Raw:", JSON.stringify(parsed).substring(0, 1000));
      return new Response(
        JSON.stringify({
          error: "AI response was incomplete. The agreement may be too long for a single AI request. Try making the change manually in the field editor instead.",
          raw: JSON.stringify(parsed).substring(0, 500),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
