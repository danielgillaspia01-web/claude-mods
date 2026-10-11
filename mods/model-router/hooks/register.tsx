import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const CHEAP_MODEL = 'claude-haiku-5-5'
const stats = atom({ plugin: 'model-router', key: 'stats' } as const, { routed: 0, kept: 0 })

// Words that mean the request needs real thinking: keep the big model.
const HARD = /\b(build|implement|design|architect|refactor|debug|why|plan|research|analy[sz]e|compare|write (a|an|the) (essay|paper|app|feature)|migrate|optimi[sz]e|review|security|test suite|from scratch)\b/i
// Small, mechanical jobs a cheaper model handles fine.
const EASY = /\b(typo|rename|format|tidy|clean ?up|sort|list|what is|what's|define|spell|capitali[sz]e|indent|add a comment|commit message|lint|convert|count|translate|summari[sz]e this|shorten)\b/i

export type Route = 'cheap' | 'big'

// Decides where a prompt goes. "!cheap" or "!big" at the start forces it.
export const classify = (text: string): { route: Route; text: string } => {
  const trimmed = text.trimStart()
  if (/^!cheap\b/i.test(trimmed)) return { route: 'cheap', text: trimmed.replace(/^!cheap\s*/i, '') }
  if (/^!big\b/i.test(trimmed)) return { route: 'big', text: trimmed.replace(/^!big\s*/i, '') }
  const isShort = text.length <= 280 && !text.includes('```')
  const route: Route = isShort && EASY.test(text) && !HARD.test(text) ? 'cheap' : 'big'

  return { route, text }
}

export const register: Register = on => {
  let pending: Route | undefined
  const cheapTurns = new Set<string>()

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'router',
      description: 'Model router: on, off, or status',
      argumentHint: '[on|off|status]',
    })

    return next(e)
  })

  on('command.run', { command: 'router' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'on' || arg === 'off') {
      await $.store.set('enabled', arg === 'on')
      $.ui.status(arg === 'on' ? undefined : 'router: off')

      return { text: `Model router is ${arg}.` }
    }
    const s = await read($, stats)
    const enabled = (await $.store.get('enabled')) !== false

    return {
      text: `Model router is ${enabled ? 'on' : 'off'}. This session: ${s.routed} request(s) sent to ${CHEAP_MODEL}, ${s.kept} kept on your main model. Start a prompt with !cheap or !big to force it.`,
    }
  })

  on('prompt.submit', async ($, e, next) => {
    if ((await $.store.get('enabled')) === false || e.turnId !== undefined) {
      pending = undefined

      return next(e)
    }
    const decision = classify(e.text)
    pending = decision.route

    return next(decision.text === e.text ? e : { ...e, text: decision.text })
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    if (pending === 'cheap') cheapTurns.add(e.turnId)
    await update($, stats, s =>
      pending === 'cheap' ? { ...s, routed: s.routed + 1 } : pending === 'big' ? { ...s, kept: s.kept + 1 } : s,
    )
    $.ui.status(pending === 'cheap' ? `router: ${CHEAP_MODEL}` : undefined)
    pending = undefined

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    // Only the main loop's steps; subagents pick their model at spawn time.
    if (e.agentId === undefined && cheapTurns.has(e.turnId)) {
      return yield* next({ ...e, model: CHEAP_MODEL })
    }

    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined) cheapTurns.clear()

    return ran
  })

  // Explore subagents only search and read files: run them on the cheap model
  // unless the caller already chose a model.
  on('agent.spawn', async ($, e, next) => {
    const enabled = (await $.store.get('enabled')) !== false
    if (enabled && e.model === undefined && e.subagentType === 'Explore') {
      return next({ ...e, model: 'haiku' })
    }

    return next(e)
  }).catch(($, e, next) => next(e))
}
