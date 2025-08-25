// Deprecated ServerContext removed. Placeholder exports to avoid build errors if stale imports linger.
export function ServerProvider({ children }) { return children }
export function useServer() { return { server: { status: 'online' } } }
export default {}
