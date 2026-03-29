import { groq } from '@ai-sdk/groq';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { agentTools } from '@/lib/agent/tools';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/solana/auth';

// Allow streaming responses up to 60 seconds for multi-step tool chains
export const maxDuration = 60;

const AGENT_SYSTEM_PROMPT = `You are an autonomous Solana DeFi trading analyst and intelligent assistant.

Your job is to help users analyze Solana tokens, find top traders, scan for volume surges, fetch OHLCV chart data, and execute swaps via Jupiter. You are also a helpful conversational assistant — if the user says hello, asks a general question, or just wants to chat, respond naturally in plain text without calling any tools.

CRITICAL RULES:
- ALWAYS write a human-readable text reply after every tool call — never leave the user with just raw tool output
- After getTokenPrices returns data, describe the price in plain language: "SOL is currently trading at $X"
- After getTokenOverview returns data, summarize the key metrics in a friendly report
- If a tool returns an error, explain what went wrong and try an alternative approach

TOOL USAGE:
- getTokenPrices: pass a comma-separated string in the "symbols" field. Example: { symbols: "SOL" } or { symbols: "JUP,BONK" }
- When the user asks for a token price by name or symbol: call getTokenPrices({ symbols: "SOL" }) directly
- For deep analysis: call resolveToken first to get the mint, then getTokenOverview + getTokenSecurity
- When asked to scan market: call getTrendingTokens + getTopBoostedTokens
- When asked to trade: call getJupiterQuote first, confirm details, then return swapPayload
- Chain tools without asking when you need multiple data points

SIGNAL FORMAT (use this when ending token analysis):
SIGNAL: [BUY|WATCH|AVOID]
REASON: <2-sentence reasoning>
CONFIDENCE: [HIGH|MEDIUM|LOW]

Always prioritize capital preservation over profit maximization.
Always respond in the same language the user writes in.`;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('matrix_session')?.value;

    if (!sessionId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { message, messages = [] } = await req.json();

    if (!message && messages.length === 0) {
      return new Response('Message is required', { status: 400 });
    }

    // Build messages array — convert UIMessage[] (with parts) to ModelMessage[] (with content)
    // convertToModelMessages is async and handles the UIMessage → CoreMessage translation
    const converted = messages.length > 0
      ? await convertToModelMessages(messages)
      : [{ role: 'user' as const, content: message as string }];

    // Groq requires tool_calls to always have an 'arguments' string.
    // When messages come from a prior streaming response the field can be undefined — fix it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coreMessages = converted.map((msg: any) => {
      if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return msg;
      return {
        ...msg,
        content: msg.content.map((part: any) =>
          part.type === 'tool-call'
            ? { ...part, input: part.input ?? {} }
            : part
        ),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    // Stream text with tools - agent can chain tool calls
    // stopWhen lets the model loop: tool call → get result → produce text reply
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: AGENT_SYSTEM_PROMPT,
      messages: coreMessages,
      tools: agentTools(session.walletAddress || ''),
      stopWhen: stepCountIs(10),
    });

    // Must use toUIMessageStreamResponse (not toTextStreamResponse) for DefaultChatTransport compatibility
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Agent API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process agent request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Get agent status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('matrix_session')?.value;

    if (!sessionId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    return Response.json({
      status: 'idle',
      currentTask: undefined,
      errorMessage: undefined,
      lastRunAt: undefined,
    });
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
}
