// Reusable async route wrapper to eliminate repetitive try/catch blocks.
// Usage: router.get('/path', asyncHandler(async (req,res) => { ... }))
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
