// ============================================================================
// Gemini RAG Chatbot Edge Function
// Zero-Cost Blueprint: Supabase Edge Functions + Google Gemini 1.5 Flash
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// Use the correct Gemini API endpoint
// Try gemini-1.5-flash first, fallback to gemini-pro if needed
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const GEMINI_EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

// Alternative endpoints if the above doesn't work:
// const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";
// const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

const SYSTEM_PROMPT = `You are the Prime Fibernet Assistant, a helpful and professional customer service bot.

IMPORTANT RULES:
1. Use ONLY the provided company knowledge context to answer questions
2. If the answer isn't in the provided context, politely say you don't know and offer to connect with a human agent
3. Do NOT mention competitors or other brands
4. Be brief, professional, and helpful
5. For pricing and plan questions, always refer to the exact plans provided in context
6. Never make up information - if unsure, offer human support

Company Context (use this information to answer):
{CONTEXT}

User's Question: {QUESTION}

Provide a helpful, accurate response based on the context above:`;

interface RequestBody {
  userId: string;
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  useCache?: boolean;
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { userId, message, conversationHistory = [], useCache = true }: RequestBody = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId or message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const startTime = Date.now();

    // Step 1: Check cache (efficiency trick to reduce API calls)
    if (useCache) {
      const questionHash = await hashQuestion(message);
      const { data: cachedResponse } = await supabaseClient
        .from("chatbot_response_cache")
        .select("*")
        .eq("question_hash", questionHash)
        .eq("is_active", true)
        .single();

      if (cachedResponse && (!cachedResponse.expires_at || new Date(cachedResponse.expires_at) > new Date())) {
        // Increment hit count (async, non-blocking)
        supabaseClient.rpc("increment_cache_hit", { p_hash: questionHash }).catch(console.error);

        // Log conversation
        logConversation(supabaseClient, {
          userId,
          userMessage: message,
          botResponse: cachedResponse.answer,
          knowledgeIds: cachedResponse.knowledge_ids || [],
          cachedResponse: true,
          processingTimeMs: Date.now() - startTime,
        }).catch(console.error);

        return new Response(
          JSON.stringify({
            response: cachedResponse.answer,
            cached: true,
            knowledgeIds: cachedResponse.knowledge_ids || [],
          }),
          { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }
    }

    // Step 2: Generate embedding for the user's question
    const questionEmbedding = await generateEmbedding(message);

    // Step 3: Search for similar knowledge chunks
    const { data: similarKnowledge, error: searchError } = await supabaseClient.rpc(
      "search_similar_knowledge",
      {
        p_embedding: questionEmbedding,
        p_limit: 5,
        p_similarity_threshold: 0.7,
      }
    );

    if (searchError) {
      console.error("Search error:", searchError);
    }

    // Step 4: Build context from retrieved knowledge
    let contextString = "";
    const knowledgeIds: string[] = [];

    if (similarKnowledge && similarKnowledge.length > 0) {
      contextString = similarKnowledge
        .map((k: any) => `[Source: ${k.source_type}] ${k.content}`)
        .join("\n\n");
      
      knowledgeIds.push(...similarKnowledge.map((k: any) => k.id));
    } else {
      // Fallback: If no similar knowledge found, use general company info
      const { data: generalInfo } = await supabaseClient
        .from("company_knowledge")
        .select("content, id")
        .eq("source_type", "information")
        .limit(3);

      if (generalInfo) {
        contextString = generalInfo.map((k: any) => k.content).join("\n\n");
        knowledgeIds.push(...generalInfo.map((k: any) => k.id));
      }
    }

    // Step 5: Build the prompt
    const prompt = SYSTEM_PROMPT
      .replace("{CONTEXT}", contextString || "General company information: Prime Fibernet provides high-speed internet services.")
      .replace("{QUESTION}", message);

    // Step 6: Generate response using Gemini
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          ...conversationHistory.slice(-10).map((msg: any) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          })),
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      
      // Try fallback endpoint if 404
      if (geminiResponse.status === 404) {
        console.log("Trying fallback endpoint: gemini-pro");
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        });
        
        if (fallbackResponse.ok) {
          geminiResponse = fallbackResponse;
        } else {
          const fallbackError = await fallbackResponse.text();
          throw new Error(`Gemini API error (both endpoints failed): ${geminiResponse.status} - ${errorText}`);
        }
      } else {
        throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
      }
    }

    const geminiData = await geminiResponse.json();
    const answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 
                   "I apologize, but I couldn't generate a response. Please try again or contact support at +91-9711912835.";

    const processingTime = Date.now() - startTime;

    // Step 7: Cache the response (if it's a common question)
    if (useCache && knowledgeIds.length > 0) {
      const questionHash = await hashQuestion(message);
      await supabaseClient
        .from("chatbot_response_cache")
        .upsert({
          question_hash: questionHash,
          question: message,
          answer: answer,
          knowledge_ids: knowledgeIds,
          hit_count: 0,
          last_used_at: new Date().toISOString(),
          is_active: true,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        }, {
          onConflict: "question_hash",
        })
        .catch(console.error);
    }

    // Step 8: Log conversation
    await logConversation(supabaseClient, {
      userId,
      userMessage: message,
      botResponse: answer,
      knowledgeIds,
      cachedResponse: false,
      processingTimeMs: processingTime,
    });

    return new Response(
      JSON.stringify({
        response: answer,
        cached: false,
        knowledgeIds,
        processingTimeMs: processingTime,
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      }
    );
  }
});

// Helper: Generate embedding using Gemini Embedding API
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${GEMINI_EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding?.values || [];
}

// Helper: Hash question for caching (simple MD5-like hash)
async function hashQuestion(question: string): Promise<string> {
  // Normalize question: lowercase, trim, remove extra spaces
  const normalized = question.toLowerCase().trim().replace(/\s+/g, " ");
  
  // Simple hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

// Helper: Log conversation
async function logConversation(
  client: any,
  data: {
    userId: string;
    userMessage: string;
    botResponse: string;
    knowledgeIds: string[];
    cachedResponse: boolean;
    processingTimeMs: number;
  }
) {
  await client.from("chatbot_conversations").insert({
    user_id: data.userId,
    user_message: data.userMessage,
    bot_response: data.botResponse,
    knowledge_ids: data.knowledgeIds,
    cached_response: data.cachedResponse,
    processing_time_ms: data.processingTimeMs,
    created_at: new Date().toISOString(),
  });
}

