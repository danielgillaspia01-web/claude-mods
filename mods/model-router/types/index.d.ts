export type RouterStats = { routed: number; kept: number }

declare module 'claude-code' {
  interface PluginState {
    'model-router': { stats: RouterStats }
  }
}
