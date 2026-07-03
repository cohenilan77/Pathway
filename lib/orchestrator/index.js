import { createTrace, startStep, finishStep, failStep, finalizeTrace } from './trace.js';
import { logOrchestrationRun } from '../orchestration-log.js';
import { routeRequest } from './router.js';
import { buildPlan, deterministicPlan } from './planner.js';
import { runSpecialist } from './runSpecialist.js';
import { synthesize } from './synthesizer.js';
import { resolveConfig } from '../advisor-prompt.js';

const DEFAULT_FOLLOW_UP = "I want to make sure I get this right — could you tell me a bit more about what you'd like help with?";

function latestMessageText(messages) {
  const last = [...(messages || [])].reverse().find((m) => m?.text);
  return last?.text || '';
}

// Single canonical multi-agent entry point: Router -> Planner -> parallel
// Specialists -> Synthesizer, with a full execution trace persisted to the
// staging Call Log. This is the only orchestration path when
// MULTI_AGENT_ORCHESTRATOR=1 — api/chat.js's single-agent path is untouched and
// remains the only path when the flag is off.
export async function runOrchestration(ctx) {
  const trace = createTrace({ conversationId: ctx.conversationId, userId: ctx.userId, feature: ctx.feature });
  const messages = ctx.messages || [];
  const latestText = latestMessageText(messages);

  try {
    // 1. ROUTER
    const routerStep = startStep(trace, { type: 'router', name: 'Router', input: { latestText } });
    const routerResult = await routeRequest({ messages, latestMessageText: latestText });
    trace.routingMethod = routerResult.method;
    trace.agentsInvoked = routerResult.agents;
    finishStep(routerStep, {
      model: routerResult.method === 'llm' ? 'claude-haiku-4-5-20251001' : null,
      inputTokens: routerResult.usage.inputTokens,
      outputTokens: routerResult.usage.outputTokens,
      toolCalls: routerResult.toolCalls,
      confidence: routerResult.confidence,
      reasoning: routerResult.reasoning,
      output: { agents: routerResult.agents, method: routerResult.method, fallbackReason: routerResult.fallbackReason || null },
      status: routerResult.method === 'regex_fallback' ? 'fallback' : 'ok',
    });
    if (routerResult.method === 'regex_fallback') {
      console.warn(`[Orchestrator] Router fallback to regex for conversation ${trace.conversationId}: ${routerResult.fallbackReason}`);
    }
    console.log(`[Orchestrator] Routing decision (${routerResult.method}): ${routerResult.agents.join(', ')} — ${routerResult.reasoning}`);

    // 2. PLANNER
    const plannerStep = startStep(trace, { type: 'planner', name: 'Planner', input: { agents: routerResult.agents } });
    let plan;
    try {
      plan = await buildPlan({ messages, latestMessageText: latestText, routerResult });
    } catch (err) {
      plan = { ...deterministicPlan(routerResult.agents), fallbackReason: err.message };
    }
    finishStep(plannerStep, {
      model: plan.method === 'llm' ? 'claude-haiku-4-5-20251001' : null,
      inputTokens: plan.usage?.inputTokens || 0,
      outputTokens: plan.usage?.outputTokens || 0,
      toolCalls: plan.toolCalls || 0,
      confidence: plan.confidence,
      missingInformation: plan.missingInformation,
      output: { steps: plan.steps.map((s) => s.agents), proceed: plan.proceed, method: plan.method },
      status: plan.method === 'deterministic' ? 'fallback' : 'ok',
    });

    if (!plan.proceed) {
      const followUp = plan.followUpQuestion || DEFAULT_FOLLOW_UP;
      finalizeTrace(trace);
      await logOrchestrationRun(trace).catch((err) => console.error('[Orchestrator] Failed to persist trace:', err));
      return {
        raw: followUp,
        summary: {
          runId: trace.id,
          agentsInvoked: [],
          routingMethod: trace.routingMethod,
          durationMs: trace.durationMs,
          confidence: plan.confidence,
          clarifyingQuestion: true,
        },
      };
    }

    // 3. SPECIALISTS (executed group-by-group; groups run in parallel internally)
    const specialistCtx = {
      messages,
      aiConfig: resolveConfig(ctx.aiConfig),
      language: ctx.language,
      kpiPromptSummary: ctx.kpiPromptSummary,
      verifiedScoringSection: ctx.verifiedScoringSection,
      stageContext: ctx.systemContext,
    };
    const specialistOutputs = [];
    for (const group of plan.steps) {
      const results = await Promise.all(group.agents.map(async (agentId) => {
        const step = startStep(trace, { type: 'specialist', name: agentId, input: { parallelGroupSize: group.agents.length } });
        try {
          const result = await runSpecialist(agentId, specialistCtx);
          finishStep(step, {
            model: 'claude-haiku-4-5-20251001',
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            toolCalls: result.toolCalls,
            confidence: result.confidence,
            reasoning: result.reasoning,
            missingInformation: result.missingInformation,
            suggestedFollowUp: result.suggestedFollowUp,
          });
          return result;
        } catch (err) {
          failStep(step, err);
          console.error(`[Orchestrator] Specialist ${agentId} failed:`, err.message);
          return null;
        }
      }));
      specialistOutputs.push(...results.filter(Boolean));
    }

    if (!specialistOutputs.length) {
      finalizeTrace(trace, { error: 'All specialists failed' });
      await logOrchestrationRun(trace).catch((err) => console.error('[Orchestrator] Failed to persist trace:', err));
      return {
        raw: "Sorry, I ran into a problem putting your answer together — please try that again.",
        summary: { runId: trace.id, agentsInvoked: trace.agentsInvoked, routingMethod: trace.routingMethod, durationMs: trace.durationMs, error: true },
      };
    }

    // 4. SYNTHESIZER
    const synthStep = startStep(trace, { type: 'synthesizer', name: 'Synthesizer', input: { contributingAgents: specialistOutputs.map((r) => r.agentId) } });
    const synthResult = await synthesize({ specialistOutputs, language: ctx.language });
    finishStep(synthStep, {
      model: synthResult.method === 'llm' ? 'claude-haiku-4-5-20251001' : null,
      inputTokens: synthResult.usage.inputTokens,
      outputTokens: synthResult.usage.outputTokens,
      output: { method: synthResult.method },
      status: synthResult.method === 'fallback_concat' ? 'fallback' : 'ok',
    });

    finalizeTrace(trace);
    await logOrchestrationRun(trace).catch((err) => console.error('[Orchestrator] Failed to persist trace:', err));

    return {
      raw: synthResult.raw,
      summary: {
        runId: trace.id,
        agentsInvoked: specialistOutputs.map((r) => r.agentId),
        routingMethod: trace.routingMethod,
        durationMs: trace.durationMs,
        confidence: trace.finalConfidence,
      },
    };
  } catch (error) {
    finalizeTrace(trace, { error });
    await logOrchestrationRun(trace).catch((err) => console.error('[Orchestrator] Failed to persist trace:', err));
    throw error;
  }
}
