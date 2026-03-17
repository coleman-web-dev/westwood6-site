import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_VARIABLE_DESCRIPTIONS = `
SYSTEM variables (auto-filled from the database, do NOT create questions for these):
- {{community_name}} - The HOA community/association name
- {{community_address}} - The community's physical address
- {{assessment_amount}} - Regular assessment amount (formatted like "$250.00")
- {{assessment_frequency}} - Payment frequency (Monthly, Quarterly, Annual)
- {{paid_through_date}} - Date through which assessments are paid (MM/DD/YYYY)
- {{current_balance}} - Current balance due on the account
- {{late_fees}} - Late fees or interest owed
- {{has_special_assessments}} - Whether special assessments exist (Yes/No)
- {{special_assessment_details}} - Details of any special assessments
- {{has_violations}} - Whether active violations exist on the property (Yes/No)
- {{violation_details}} - List of active violations
- {{completion_date}} - Date the certificate was completed

REQUESTER variables (filled by the external requester on the public form):
- {{requester_company}} - Title company, attorney, or requester name
- {{requester_contact}} - Contact person name
- {{requester_email}} - Requester's email address
- {{requester_phone}} - Requester's phone number
- {{owner_names}} - Property owner name(s)
- {{property_address}} - The property's street address
- {{lot_number}} - Lot or unit number
- {{under_contract}} - Whether property is under contract (Yes/No)
- {{closing_date}} - Closing or transfer date
- {{request_date}} - Date of the estoppel request
- {{delivery_email}} - Email to deliver the completed certificate to

BOARD variables (filled by a board member during review):
- {{insurance_carrier}} - Insurance carrier or agent name
- {{insurance_contact}} - Insurance phone/email
- {{litigation_pending}} - Whether litigation affects this property (Yes/No)
- {{litigation_description}} - Description of pending litigation
- {{transfer_fee}} - Transfer fee amount
- {{capital_contribution}} - Capital contribution amount
- {{other_fees}} - Other applicable fees
- {{other_fees_description}} - Description of other fees
- {{completed_by_name}} - Name of person completing the certificate
- {{completed_by_title}} - Title of person completing the certificate
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const body = await req.json();
    const { estoppel_text, refinement } = body;

    const isRefinement = refinement && typeof refinement === "object" && refinement.instruction;
    if (!isRefinement && (!estoppel_text || typeof estoppel_text !== "string")) {
      return new Response(
        JSON.stringify({ error: "estoppel_text or refinement is required" }),
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

    let userPrompt: string;

    if (isRefinement) {
      const fieldsJson = JSON.stringify(refinement.current_fields ?? [], null, 2);
      userPrompt = `You are helping an admin refine an estoppel certificate template for an HOA community portal.

Here is the current estoppel template (with {{placeholder}} variables):
---
${refinement.current_template ?? ""}
---

Here are the current fields:
${fieldsJson}

${SYSTEM_VARIABLE_DESCRIPTIONS}

The admin has requested this change:
"${refinement.instruction}"

Apply the requested change to the template and/or fields.

Return a JSON object with exactly this structure:
{
  "template": "The updated estoppel template with {{placeholders}}",
  "fields": [updated array of field objects],
  "summary": "Brief description of what you changed"
}

Each field object must have: id (UUID string), key (lowercase_underscore), label (question text), type (text|number|yes_no|select|date), required (boolean), fill_phase ("requester", "system", or "board").

fill_phase rules:
- "requester": information provided by the external party requesting the estoppel (title company, attorney, etc.) - things like their company name, contact info, property details, closing date
- "system": information auto-filled from the HOA database - assessment amounts, account balances, violations, payment history
- "board": information the board member fills in during review - insurance details, litigation status, transfer fees, capital contributions, certification/signature fields

Keep any existing field IDs unchanged if the field still exists. Generate new UUIDs only for new fields.
Include "options" array only for fields with type "select".

Return ONLY the JSON object, no markdown code fences, no extra text.`;
    } else {
      userPrompt = `You are analyzing an estoppel certificate form for an HOA community portal. Your job is to:

1. Read the estoppel certificate text below carefully.
2. Identify ALL fill-in-the-blank fields. These are indicated by:
   - Underlines or blank lines (_____, __________)
   - Explicitly variable content (names, dates, amounts that change per request)
   - Fields that would be different for each estoppel request
   - Checkboxes or Yes/No fields
3. For each blank, determine if it matches a known variable (SYSTEM, REQUESTER, or BOARD) or needs a custom field.

${SYSTEM_VARIABLE_DESCRIPTIONS}

For any blank that does NOT match one of the variables above, create a custom field with an appropriate fill_phase:
- "requester" if the external party (title company/attorney) would provide this info
- "system" if it can be looked up from HOA records
- "board" if a board member needs to provide this during review

IMPORTANT RULES:
- Replace ALL blanks with {{placeholders}}, not just some
- Use the exact variable keys listed above when they match
- For custom fields, use lowercase_underscore keys
- Keep ALL the original text intact, just replace the blanks
- Dates formatted as "___/___/____" should use the appropriate date variable
- Fee amounts that are fixed per community (like estoppel fees) should be board variables
- Financial data about the property (balances, assessments) should be system variables
- Information about who is requesting and the property sale should be requester variables

Return a JSON object with exactly this structure:
{
  "template": "The full estoppel text with {{placeholders}} replacing all blanks",
  "fields": [
    {
      "id": "unique-uuid-string",
      "key": "variable_key",
      "label": "Field label or question",
      "type": "text|number|yes_no|select|date",
      "required": true/false,
      "fill_phase": "requester|system|board"
    }
  ],
  "summary": "Brief description of what was found"
}

Only include "options" array for fields with type "select".
Generate a unique UUID for each field's "id".
Include "placeholder" string for text/number fields where helpful.

Here is the estoppel certificate text to analyze:

---
${estoppel_text}
---

Return ONLY the JSON object, no markdown code fences, no extra text.`;
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

    let parsed;
    try {
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

    if (!parsed.template || !Array.isArray(parsed.fields)) {
      console.error("AI response missing required fields:", Object.keys(parsed));
      return new Response(
        JSON.stringify({
          error: "AI response was incomplete. Try again or use the manual field editor.",
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
