import logger from "@/lib/logger";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-2.0-flash";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterChatRequest {
  model?: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenRouterChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

async function openrouterFetch<T>(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string
): Promise<T> {
  const response = await fetch(`${OPENROUTER_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://enrichengine.io",
      "X-Title": "EnrichEngine",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, errorText },
      "OpenRouter API error"
    );

    let errorMessage = `OpenRouter API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText) as OpenRouterError;
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      errorMessage = `OpenRouter API error: ${response.status} - ${errorText}`;
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export interface GenerateFirstLineParams {
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  company: string | null;
  linkedinUrl: string | null;
  userPrompt: string;
}

export interface GenerateFirstLineResult {
  generatedLine: string;
  tokensUsed: number;
  rawResponse: OpenRouterChatResponse;
}

const SYSTEM_PROMPT = `You are an expert cold email copywriter. Your task is to write personalized first lines for sales outreach.

RULES:
1. Write ONLY the first line - no greetings, no "Hi [Name]"
2. Keep it under 20 words
3. Be specific and personal - reference something unique about the person or company
4. Sound natural, not salesy
5. Create genuine curiosity
6. Do not use generic phrases like "I noticed" or "I saw that"
7. Be creative and stand out from typical cold emails

Respond with ONLY the first line, nothing else.`;

export async function generateFirstLine(
  params: GenerateFirstLineParams,
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<GenerateFirstLineResult> {
  const { firstName, lastName, role, company, linkedinUrl, userPrompt } =
    params;

  const leadContext = [
    firstName || lastName ? `Name: ${[firstName, lastName].filter(Boolean).join(" ")}` : null,
    role ? `Role: ${role}` : null,
    company ? `Company: ${company}` : null,
    linkedinUrl ? `LinkedIn: ${linkedinUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userMessage = `USER'S CUSTOMIZATION:
${userPrompt}

LEAD CONTEXT:
${leadContext || "No additional context available"}

Generate a personalized first line for this lead.`;

  logger.info(
    { firstName, lastName, company, model },
    "Generating first line via OpenRouter"
  );

  const response = await openrouterFetch<OpenRouterChatResponse>(
    "/chat/completions",
    {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 100,
    },
    apiKey
  );

  const generatedLine =
    response.choices[0]?.message?.content?.trim() || "";
  const tokensUsed = response.usage?.total_tokens || 0;

  logger.info(
    {
      firstName,
      lastName,
      company,
      tokensUsed,
      generatedLine: generatedLine.substring(0, 50) + "...",
    },
    "First line generated via OpenRouter"
  );

  return {
    generatedLine,
    tokensUsed,
    rawResponse: response,
  };
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    await openrouterFetch<OpenRouterChatResponse>(
      "/chat/completions",
      {
        model: DEFAULT_MODEL,
        messages: [
          { role: "user", content: "Say 'test' in one word." },
        ],
        max_tokens: 10,
      },
      apiKey
    );
    return true;
  } catch (error) {
    logger.error({ error }, "OpenRouter API key test failed");
    return false;
  }
}
