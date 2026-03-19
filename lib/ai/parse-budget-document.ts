import { getAnthropicClient } from '@/lib/ai/anthropic';
import type { BudgetCategory } from '@/lib/types/database';

const BUDGET_SYSTEM_PROMPT = `You are an AI assistant for DuesIQ, an HOA management platform. You are extracting budget line items from a Homeowners Association budget document.

Your job is to identify every income and expense line item in the document, categorize it, and extract the annual budgeted amount AND the actual amount (if present).

For each line item, determine:
- name: A descriptive name for the line item (e.g., "Monthly Dues", "Landscaping Contract", "General Liability Insurance")
- category: One of these exact values: dues, assessments, amenity_fees, interest, maintenance, landscaping, insurance, utilities, management, legal, reserves, other
- budgeted_amount: The annual budgeted amount in CENTS (e.g., $15,000.00 = 1500000). If the document shows monthly amounts, multiply by 12 to get annual. If quarterly, multiply by 4.
- actual_amount: The actual/YTD amount spent or received in CENTS. If the document has an "Actual", "YTD", "Year to Date", or similar column, use that value. If no actual amount is present, use 0.
- is_income: true if this is revenue/income (dues, fees collected, interest earned), false if it is an expense

Category guidance:
- dues: Regular HOA dues/assessments collected from homeowners
- assessments: Special assessments or one-time charges
- amenity_fees: Pool fees, clubhouse rental income, etc.
- interest: Bank interest, investment returns
- maintenance: Building repairs, general maintenance, pest control
- landscaping: Lawn care, tree trimming, irrigation
- insurance: Property insurance, liability insurance, D&O insurance
- utilities: Electric, water, sewer, internet, phone
- management: Property management company fees, accounting
- legal: Attorney fees, collections, court costs
- reserves: Reserve fund contributions (use this for transfers to reserves)
- other: Anything that doesn't fit the above categories

Important:
- Include ALL line items from the document, even small ones
- If the document has subtotals or totals, do NOT include those as line items
- If a line item could fit multiple categories, pick the most specific one
- Convert all amounts to annual figures in cents
- Many budget documents have both a "Budget" and "Actual" column. Extract BOTH values.

Return ONLY a valid JSON object with this structure (no markdown code fences):
{
  "items": [
    {
      "name": "Monthly Dues",
      "category": "dues",
      "budgeted_amount": 1500000,
      "actual_amount": 1350000,
      "is_income": true
    }
  ]
}`;

export interface ParsedBudgetItem {
  name: string;
  category: BudgetCategory;
  budgeted_amount: number;
  actual_amount: number;
  is_income: boolean;
}

interface ParseBudgetResult {
  items: ParsedBudgetItem[];
}

export async function parseBudgetDocument(
  fileData: Buffer,
  mimeType: string,
): Promise<ParseBudgetResult> {
  const client = getAnthropicClient();
  const base64Data = fileData.toString('base64');

  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  if (!isPdf && !isImage) {
    throw new Error('Unsupported file type. Please upload a PDF or image file.');
  }

  const documentContent = isPdf
    ? {
        type: 'document' as const,
        source: {
          type: 'base64' as const,
          media_type: 'application/pdf' as const,
          data: base64Data,
        },
      }
    : {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
          data: base64Data,
        },
      };

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: BUDGET_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          documentContent,
          {
            type: 'text',
            text: 'Extract all budget line items from this HOA budget document. Return ONLY valid JSON, no markdown code fences.',
          },
        ],
      },
    ],
  });

  const response = await stream.finalMessage();
  const textBlock = response.content.find((b) => b.type === 'text');

  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No response from AI');
  }

  const rawText = textBlock.text.trim();
  const jsonText = rawText.startsWith('{')
    ? rawText
    : rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');

  const parsed = JSON.parse(jsonText);

  // Validate and sanitize the response
  const validCategories: BudgetCategory[] = [
    'dues', 'assessments', 'amenity_fees', 'interest', 'maintenance',
    'landscaping', 'insurance', 'utilities', 'management', 'legal',
    'reserves', 'other',
  ];

  const items: ParsedBudgetItem[] = (parsed.items || [])
    .filter((item: Record<string, unknown>) => item.name && typeof item.budgeted_amount === 'number')
    .map((item: Record<string, unknown>) => ({
      name: String(item.name).trim(),
      category: validCategories.includes(item.category as BudgetCategory)
        ? (item.category as BudgetCategory)
        : 'other',
      budgeted_amount: Math.round(Math.abs(Number(item.budgeted_amount))),
      actual_amount: typeof item.actual_amount === 'number'
        ? Math.round(Math.abs(Number(item.actual_amount)))
        : 0,
      is_income: Boolean(item.is_income),
    }));

  return { items };
}
