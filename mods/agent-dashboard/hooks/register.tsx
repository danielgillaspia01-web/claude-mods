import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRow } from '../types'

const PANE = 'agent-dashboard'
const MAIN = 'main'
const rows = atom({ plugin: 'agent-dashboard', key: 'rows' } as const, [])

const short = (text: string, max = 48) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

// A readable one-liner for what a tool call is doing.
export const describeCall = (tool: string, input: Record<string, unknown>) => {
  const pick = (key: string) =>
    typeof input[key] === 'string' ? (input[key] as string) : undefined
  const path = pick('file_path')
  const detail =
    pick('description') ??
    pick('command') ??
    (path ? path.split('/').pop() : undefined) ??
    pick('pattern') ??
    pick('query') ??
    pick('url')

  return detail ? `${tool}: ${short(detail.replace(/\s+/g, ' '))}` : tool
}

const upsert = (list: AgentRow[], id: string, change: Partial<AgentRow>) => {
  const found = list.find(row => row.id === id)
  if (found) {
    return list.map(row => (row.id === id ? { ...row, ...change } : row))
  }

  return [
    ...list,
    { id, label: id, status: 'running', lastAction: '', tools: 0, ...change },
  ]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'agents',
      description: 'Open the live dashboard of what each agent is doing',
    })
    await update($, rows, list =>
      list.length > 0 ? list : upsert([], MAIN, { label: 'Main session', status: 'idle' }),
    )

    // Keep subagent statuses fresh while they run in the background.
    $.clock.every(2000, () => {
      void (async () => {
        const agents = await $.agent.list()
        const current = await read($, rows)
        let merged = current
        for (const agent of agents) {
          const label = agent.name ?? `${agent.type}: ${short(agent.description, 32)}`
          const had = merged.find(row => row.id === agent.id)
          if (!had || had.status !== agent.status || had.label !== label) {
            merged = upsert(merged, agent.id, { label, status: agent.status })
          }
        }
        if (merged !== current) {
          await update($, rows, () => merged.slice(-30))
        }
      })().catch(() => undefined)
    })

    return next(e)
  })

  on('command.run', { command: 'agents' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Agents' })

    return {
      text: opened.isPlaced
        ? 'Agent dashboard opened.'
        : 'Agent dashboard is ready, but this screen has no room for a pane right now.',
    }
  })

  on('turn.start', async ($, e, next) => {
    await update($, rows, list => upsert(list, MAIN, { status: 'working' }))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await update($, rows, list =>
      upsert(list, MAIN, { status: 'idle', lastAction: 'Finished the turn' }),
    )

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId ?? MAIN
    const action = describeCall(String(e.tool), e as unknown as Record<string, unknown>)
    await update($, rows, list => {
      const before = list.find(row => row.id === id)

      return upsert(list, id, {
        lastAction: action,
        tools: (before?.tools ?? 0) + 1,
        status: id === MAIN ? 'working' : (before?.status ?? 'running'),
      })
    })

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, rows)
    const busy = list.filter(row => ['running', 'working', 'pending'].includes(row.status))

    return (
      <Box flexDirection="column">
        <Text bold>
          {busy.length} active · {list.length} total
        </Text>
        {list.map(row => (
          <Box key={row.id} flexDirection="column" marginTop={1}>
            <Text bold={busy.includes(row)} dimColor={!busy.includes(row)}>
              {busy.includes(row) ? '● ' : '○ '}
              {row.label}
              <Text dimColor>  {row.status} · {row.tools} tools</Text>
            </Text>
            {row.lastAction !== '' && <Text dimColor>   {row.lastAction}</Text>}
          </Box>
        ))}
      </Box>
    )
  })
}
