import logger from "@/lib/logger";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

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

// ============================================
// ICP Classification
// ============================================

export interface ICPContext {
  companyInsights: {
    industry?: string;
    size?: string;
    techStack?: string[];
    recentNews?: string[];
    fundingStage?: string;
    websiteAnalysis?: string;
  };
  personInsights: {
    recentActivity?: string[];
    interests?: string[];
    postingFrequency?: string;
  };
  fitAnalysis: {
    score: number;
    reasons: string[];
    concerns: string[];
    personalizationHooks: string[];
  };
}

export interface ClassifyICPParams {
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  company: string | null;
  companyDomain: string | null;
  linkedinUrl: string | null;
  userPrompt: string;
  webResearchContext?: string;
}

export interface ClassifyICPResult {
  icpScore: number;
  icpContext: ICPContext;
  tokensUsed: number;
  rawResponse: OpenRouterChatResponse;
}

const ICP_SYSTEM_PROMPT = `You are an expert sales development representative analyzing leads against an Ideal Customer Profile (ICP).

Your task is to:
1. Analyze the lead and company information provided
2. Score how well they match the user's ICP criteria (0-100)
3. Identify specific reasons why they're a good fit
4. Flag any concerns or red flags
5. Suggest personalization hooks for outreach

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "companyInsights": {
    "industry": "string or null",
    "size": "string or null",
    "techStack": ["array of strings"],
    "recentNews": ["array of strings"],
    "fundingStage": "string or null",
    "websiteAnalysis": "string or null"
  },
  "personInsights": {
    "recentActivity": ["array of strings"],
    "interests": ["array of strings"],
    "postingFrequency": "string or null"
  },
  "fitAnalysis": {
    "score": 0-100,
    "reasons": ["array of 2-4 specific reasons they're a good fit"],
    "concerns": ["array of 0-3 concerns or red flags"],
    "personalizationHooks": ["array of 2-4 specific things to mention in outreach"]
  }
}

Be specific and actionable. If information is missing, make reasonable inferences but note uncertainty.`;

export async function classifyICP(
  params: ClassifyICPParams,
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<ClassifyICPResult> {
  const {
    firstName,
    lastName,
    role,
    company,
    companyDomain,
    linkedinUrl,
    userPrompt,
    webResearchContext,
  } = params;

  const leadContext = [
    firstName || lastName ? `Name: ${[firstName, lastName].filter(Boolean).join(" ")}` : null,
    role ? `Role: ${role}` : null,
    company ? `Company: ${company}` : null,
    companyDomain ? `Domain: ${companyDomain}` : null,
    linkedinUrl ? `LinkedIn: ${linkedinUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userMessage = `ICP CRITERIA FROM USER:
${userPrompt}

LEAD INFORMATION:
${leadContext || "Limited information available"}

${webResearchContext ? `WEB RESEARCH CONTEXT:\n${webResearchContext}` : ""}

Analyze this lead against the ICP criteria and return the JSON analysis.`;

  logger.info(
    { firstName, lastName, company, model },
    "Classifying lead against ICP via OpenRouter"
  );

  const response = await openrouterFetch<OpenRouterChatResponse>(
    "/chat/completions",
    {
      model,
      messages: [
        { role: "system", content: ICP_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    },
    apiKey
  );

  const content = response.choices[0]?.message?.content?.trim() || "{}";
  const tokensUsed = response.usage?.total_tokens || 0;

  // Parse JSON response
  let icpContext: ICPContext;
  try {
    // Handle markdown code blocks if present
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (content.includes("```")) {
      jsonContent = content.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(jsonContent.trim());
    icpContext = {
      companyInsights: parsed.companyInsights || {},
      personInsights: parsed.personInsights || {},
      fitAnalysis: {
        score: Math.min(100, Math.max(0, parsed.fitAnalysis?.score || 0)),
        reasons: parsed.fitAnalysis?.reasons || [],
        concerns: parsed.fitAnalysis?.concerns || [],
        personalizationHooks: parsed.fitAnalysis?.personalizationHooks || [],
      },
    };
  } catch (parseError) {
    logger.warn(
      { parseError, content },
      "Failed to parse ICP classification response"
    );
    icpContext = {
      companyInsights: {},
      personInsights: {},
      fitAnalysis: {
        score: 50,
        reasons: ["Unable to fully analyze - limited data"],
        concerns: ["Analysis parsing error"],
        personalizationHooks: [],
      },
    };
  }

  logger.info(
    {
      firstName,
      lastName,
      company,
      tokensUsed,
      icpScore: icpContext.fitAnalysis.score,
    },
    "ICP classification completed"
  );

  return {
    icpScore: icpContext.fitAnalysis.score,
    icpContext,
    tokensUsed,
    rawResponse: response,
  };
}

// ============================================
// Multi-Column Personalization
// ============================================

export type PersonalizationColumnType =
  | "subject"
  | "firstLine"
  | "openingParagraph"
  | "followUp1"
  | "followUp2"
  | "followUp3"
  | "callToAction"
  | "custom";

export interface ColumnConfig {
  columnType: PersonalizationColumnType;
  columnName: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}

export interface GenerateColumnParams {
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  company: string | null;
  linkedinUrl: string | null;
  icpContext?: ICPContext | null;
  columnConfig: ColumnConfig;
}

export interface GenerateColumnResult {
  columnName: string;
  generatedContent: string;
  tokensUsed: number;
}

const COLUMN_SYSTEM_PROMPTS: Record<PersonalizationColumnType, string> = {
  subject: `You are an expert email copywriter. Write a compelling email subject line.
RULES:
- Maximum 60 characters
- Create curiosity without being clickbait
- Be specific and personal when possible
- No ALL CAPS or excessive punctuation
Respond with ONLY the subject line, nothing else.`,

  firstLine: `You are an expert cold email copywriter. Write a personalized first line.
RULES:
- Under 20 words
- Be specific and personal
- Sound natural, not salesy
- Create genuine curiosity
- No greetings like "Hi [Name]"
Respond with ONLY the first line, nothing else.`,

  openingParagraph: `You are an expert cold email copywriter. Write an opening paragraph.
RULES:
- 2-3 sentences maximum
- Reference something specific about the person or company
- Naturally transition to your value proposition
- Be conversational, not formal
Respond with ONLY the paragraph, nothing else.`,

  followUp1: `You are an expert cold email copywriter. Write follow-up #1 (3 days after initial email).
RULES:
- Brief and to the point
- Reference the previous email
- Add new value or angle
- Include a soft call to action
Respond with ONLY the email body, nothing else.`,

  followUp2: `You are an expert cold email copywriter. Write follow-up #2 (1 week after initial).
RULES:
- Different angle from previous emails
- Share a relevant insight or resource
- Keep it shorter than follow-up #1
Respond with ONLY the email body, nothing else.`,

  followUp3: `You are an expert cold email copywriter. Write the final "break-up" email.
RULES:
- Acknowledge this is your last outreach
- Leave door open for future
- Make it easy to say no
- Be respectful and professional
Respond with ONLY the email body, nothing else.`,

  callToAction: `You are an expert cold email copywriter. Write a low-commitment call to action.
RULES:
- Make it easy to say yes
- Specific time suggestion if appropriate
- One action only
- Under 15 words
Respond with ONLY the CTA, nothing else.`,

  custom: `You are an expert copywriter. Generate content based on the user's specific instructions.
Respond with ONLY the requested content, nothing else.`,
};

export async function generateColumn(
  params: GenerateColumnParams,
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<GenerateColumnResult> {
  const {
    firstName,
    lastName,
    role,
    company,
    linkedinUrl,
    icpContext,
    columnConfig,
  } = params;

  const leadContext = [
    firstName || lastName ? `Name: ${[firstName, lastName].filter(Boolean).join(" ")}` : null,
    role ? `Role: ${role}` : null,
    company ? `Company: ${company}` : null,
    linkedinUrl ? `LinkedIn: ${linkedinUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let icpInfo = "";
  if (icpContext) {
    const hooks = icpContext.fitAnalysis?.personalizationHooks || [];
    const reasons = icpContext.fitAnalysis?.reasons || [];
    if (hooks.length > 0 || reasons.length > 0) {
      icpInfo = `\nPERSONALIZATION HOOKS:\n${[...hooks, ...reasons].slice(0, 4).join("\n")}`;
    }
  }

  const systemPrompt = COLUMN_SYSTEM_PROMPTS[columnConfig.columnType];
  const userMessage = `USER INSTRUCTIONS:
${columnConfig.prompt}

LEAD CONTEXT:
${leadContext || "No additional context available"}
${icpInfo}

Generate the ${columnConfig.columnName}.`;

  logger.debug(
    { firstName, lastName, company, columnType: columnConfig.columnType },
    "Generating personalization column"
  );

  const response = await openrouterFetch<OpenRouterChatResponse>(
    "/chat/completions",
    {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: columnConfig.temperature,
      max_tokens: columnConfig.maxTokens,
    },
    apiKey
  );

  const generatedContent = response.choices[0]?.message?.content?.trim() || "";
  const tokensUsed = response.usage?.total_tokens || 0;

  return {
    columnName: columnConfig.columnName,
    generatedContent,
    tokensUsed,
  };
}

export async function generateAllColumns(
  lead: {
    firstName: string | null;
    lastName: string | null;
    role: string | null;
    company: string | null;
    linkedinUrl: string | null;
    icpContext?: ICPContext | null;
  },
  columns: ColumnConfig[],
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<{
  results: Record<string, string>;
  totalTokensUsed: number;
}> {
  const results: Record<string, string> = {};
  let totalTokensUsed = 0;

  for (const columnConfig of columns) {
    const result = await generateColumn(
      {
        firstName: lead.firstName,
        lastName: lead.lastName,
        role: lead.role,
        company: lead.company,
        linkedinUrl: lead.linkedinUrl,
        icpContext: lead.icpContext,
        columnConfig,
      },
      apiKey,
      model
    );

    results[result.columnName] = result.generatedContent;
    totalTokensUsed += result.tokensUsed;
  }

  return { results, totalTokensUsed };
}
