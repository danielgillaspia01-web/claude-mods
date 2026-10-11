import type { Register } from 'claude-code'

const KEY = 'handoff'

type Handoff = { text: string; savedAt: number; note: string }

const ASK = (note: string) =>
  [
    'Write a handoff note so a different Claude session can continue this work with no other context.',
    'Use these headings: Goal, What is done, What is left (as a numbered list of next steps), Key files and decisions, Watch out for.',
    'Be specific: name files, commands, and choices already made. Keep it under 400 words. Output only the note.',
    note ? `The person adds: ${note}` : '',
  ]
    .filter(Boolean)
    .join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'handoff',
      description: 'Save a summary of this session so another session can pick it up',
      argumentHint: '[what the next session should focus on]',
    })
    await $.command.register({
      name: 'pickup',
      description: 'Continue the work the last /handoff saved',
    })

    return next(e)
  })

  on('command.run', { command: 'handoff' }, async ($, e) => {
    $.ui.status('handoff: writing summary…')
    const answer = await $.model.fork({ prompt: ASK(e.args.trim()) })
    $.ui.status(undefined)
    if (!answer.isAnswered) {
      return {
        text:
          answer.reason === 'nothing-to-fork'
            ? 'Nothing to hand off yet: this session has no work in it.'
            : `Could not write the handoff (${answer.reason}).`,
      }
    }
    const saved: Handoff = { text: answer.text, savedAt: await $.clock.now(), note: e.args.trim() }
    await $.store.set(KEY, saved)
    $.ui.toast('Handoff saved. Run /pickup in another session.')

    return { text: `Handoff saved:\n\n${answer.text}` }
  })

  on('command.run', { command: 'pickup' }, async $ => {
    const saved = (await $.store.get(KEY)) as Handoff | undefined
    if (!saved?.text) {
      return { text: 'No handoff saved. Run /handoff in the session you want to continue from.' }
    }
    const minutes = Math.round(((await $.clock.now()) - saved.savedAt) / 60000)
    await $.store.delete(KEY)
    await $.prompt.submit({
      text: `Another session handed this work to you. Read the note, then continue with the next step.\n\n${saved.text}`,
    })

    return { text: `Picked up a handoff from ${minutes} minute(s) ago.` }
  })
}
