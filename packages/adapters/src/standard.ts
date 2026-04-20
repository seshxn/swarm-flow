import type { AgentAdapter, AgentAdapterRequest, AgentAdapterResult } from "./index.js";

export class StandardAgentAdapter implements AgentAdapter {
  id = "standard";

  async invoke(request: AgentAdapterRequest): Promise<AgentAdapterResult> {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!anthropicKey && !openaiKey) {
      return { 
        ok: false, 
        artifacts_created: {}, 
        reasons: ["No ANTHROPIC_API_KEY or OPENAI_API_KEY found in environment"] 
      };
    }

    const contextContext = Object.entries(request.contextFiles)
      .map(([name, content]) => `--- File: ${name} ---\n${content}`)
      .join("\n\n");

    const prompt = `You are a specialist agent "${request.agentId}" operating inside swarm-flow.
Your current phase is "${request.phaseId}".
The overall goal for this run is: ${request.goal}

You must produce the following required artifacts:
${request.requiredOutputs.map(o => "- " + o).join("\n")}

Available Context (e.g. skills, previous artifacts, repo files):
${contextContext}

Please generate the required outputs. Format your response strictly using XML tags for each artifact, like this:
<artifact id="name_of_artifact">
# content of artifact
</artifact>

Return all required artifacts. Do not include extraneous markdown outside the artifact blocks.`;

    let generatedText = "";
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
             max_tokens: 4096,
             messages: [{ role: "user", content: prompt }]
           })
         });
         
         if (!res.ok) {
           const body = await res.text();
           throw new Error(`Anthropic API error: ${res.status} ${body}`);
         }

         const data = await res.json();
         generatedText = data.content?.[0]?.text || "";
      } else if (openaiKey) {
         const res = await fetch(process.env.OPENAI_API_BASE || "https://api.openai.com/v1/chat/completions", {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             "Authorization": `Bearer ${openaiKey}`
           },
           body: JSON.stringify({
             model: process.env.OPENAI_MODEL || "gpt-4o",
             max_tokens: 4096,
             messages: [{ role: "user", content: prompt }]
           })
         });

         if (!res.ok) {
           const body = await res.text();
           throw new Error(`OpenAI API error: ${res.status} ${body}`);
         }

         const data = await res.json();
         generatedText = data.choices?.[0]?.message?.content || "";
      }

      // Parse the XML artifact tags
      const artifacts_created: Record<string, string> = {};
      const artifactRegex = new RegExp(`<artifact\\\\s+id=["']([^"']+)["']>([\\\\s\\\\S]*?)<\\\\/artifact>`, 'g');
      
      let match;
      while ((match = artifactRegex.exec(generatedText)) !== null) {
         const id = match[1];
         const content = match[2]?.trim() || "";
         artifacts_created[id] = content;
      }

      const missing = request.requiredOutputs.filter(req => !artifacts_created[req]);
      if (missing.length > 0) {
         return {
           ok: false,
           artifacts_created,
           reasons: [`Agent failed to generate required artifacts: ${missing.join(", ")}`]
         };
      }

      return {
        ok: true,
        artifacts_created,
        reasons: []
      };
    } catch (err) {
      return {
        ok: false,
        artifacts_created: {},
        reasons: [`API execution failed: ${err instanceof Error ? err.message : String(err)}`]
      };
    }
  }
}
