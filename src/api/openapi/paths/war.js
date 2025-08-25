// Modular war-related OpenAPI path snippets kept intentionally shallow to avoid previous nesting issues.
export const warPaths = {
  '/war/prep-stats': {
    get: {
      summary: 'War preparation stats',
      parameters: [
        { name: 'tag', in: 'query', required: true, schema: { type: 'string' } },
        { name: 'heroes', in: 'query', required: false, schema: { type: 'boolean' } },
        { name: 'heroSampleSize', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 50 } }
      ],
      responses: { '200': { description: 'Prep stats payload', content: { 'application/json': { schema: { $ref: '#/components/schemas/PrepStats' } } } } }
    }
  },
  '/war/push-prep': {
    post: {
      summary: 'Emit current prep stats via websocket',
      responses: { '200': { description: 'Emitted' } }
    }
  },
  '/coc/clan/warlog': {
    get: {
      summary: 'Clan war log (paginated)',
      parameters: [
        { name: 'tag', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1 } },
        { name: 'pageSize', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 50 } }
      ],
      responses: { '200': { description: 'Paginated war log response', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedWarLog' } } } } }
    }
  }
};
