export type AgentRow = {
  id: string
  label: string
  status: string
  lastAction: string
  tools: number
}

declare module 'claude-code' {
  interface PluginState {
    'agent-dashboard': { rows: AgentRow[] }
  }
}
