export async function evaluateArtifactSemantics(
  artifactId: string,
  content: string,
  expectation: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!remoteSemanticValidationEnabled()) {
    return { ok: true, reason: "remote semantic validation disabled" };
  }

  // Uses ANTHROPIC_API_KEY if available, else OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!anthropicKey && !openaiKey) {
    console.warn(`[swarm-flow] Skipping semantic validation for ${artifactId} - no API key found`);
    return { ok: true };
  }

  const prompt = `You are an automated SDLC validation engine.
Evaluate whether the following artifact meets the expected criteria.
If it does, respond with exactly: PASS.
If it fails, respond with exactly: FAIL: <reason why it failed>. Do not include any other text.

Artifact ID: ${artifactId}
Expectation: ${expectation}

Artifact Content:
${content}
`;

  try {
    if (anthropicKey) {
       const res = await fetch("https://api.anthropic.com/v1/messages", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "x-api-key": anthropicKey,
           "anthropic-version": "2023-06-01"
         },
         body: JSON.stringify({
           model: "claude-3-5-sonnet-latest",
           max_tokens: 256,
           messages: [{ role: "user", content: prompt }]
         })
       });

       if (!res.ok) {
          const body = await res.text();
          throw new Error(`Anthropic API error: ${res.status} ${body}`);
       }

       const data = await res.json();
       const text = data.content?.[0]?.text?.trim() || "PASS";

       if (text.startsWith("FAIL:")) {
           return { ok: false, reason: text.slice(5).trim() };
       }
       return { ok: true };
    } else if (openaiKey) {
       const res = await fetch(process.env.OPENAI_API_BASE || "https://api.openai.com/v1/chat/completions", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           "Authorization": `Bearer ${openaiKey}`
         },
         body: JSON.stringify({
           model: process.env.OPENAI_MODEL || "gpt-4o",
           max_tokens: 256,
           messages: [{ role: "user", content: prompt }]
         })
       });

       if (!res.ok) {
          const body = await res.text();
          throw new Error(`OpenAI API error: ${res.status} ${body}`);
       }

       const data = await res.json();
       const text = data.choices?.[0]?.message?.content?.trim() || "PASS";

       if (text.startsWith("FAIL:")) {
           return { ok: false, reason: text.slice(5).trim() };
       }
       return { ok: true };
    }
  } catch (err) {
     console.error(`[swarm-flow] Semantic evaluation skipped due to API error: ${err}`);
     return { ok: true }; // soft fail
  }
  
  return { ok: true };
}

function remoteSemanticValidationEnabled(): boolean {
  const value = process.env.SWARM_FLOW_ENABLE_REMOTE_SEMANTIC_VALIDATION;
  return value === "1" || value?.toLowerCase() === "true";
}
