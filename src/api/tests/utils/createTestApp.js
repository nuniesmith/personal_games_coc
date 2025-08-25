// Helper to lazily import the running Express app without starting a new listener
export async function getServerApp() {
  const mod = await import('../../server.js');
  return mod.app;
}
