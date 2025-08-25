// NOTE: Keep this file simple; complex nested inline objects previously tripped Babel in tests.
import { warPaths } from './openapi/paths/war.js';

export function getOpenApiSpec(baseUrl = '') {
  // Shallow merge of modular path groups kept minimal to avoid historical Babel / transform edge cases.
  const paths = {
    '/auth/login': { post: { summary: 'Login (JWT)', responses: { '200': { description: 'OK' } } } },
    '/coc/summary': { get: { summary: 'Clan summary aggregated', parameters: [{ name: 'tag', in: 'query', required: true }], responses: { '200': { description: 'OK' } } } },
    '/assignments/generate': { post: { summary: 'Generate war assignments', responses: { '200': { description: 'OK' } } } },
    '/system/health': { get: { summary: 'System stats (auth required)', responses: { '200': { description: 'OK' } } } },
    ...warPaths
  };
  return {
    openapi: '3.1.0',
    info: {
      title: 'Clash Ops API',
      version: '0.1.0',
      description: [
        'Phase 2 scaffold spec. Endpoints subject to change.',
        '',
        'Socket Events:',
        '- war:update (live war payload)',
        '- coc:summary:update (light summary diff)',
        '- war:prepStatsPush (prep stats broadcast)',
        '- assignments:generated (assignment generation result)',
        '- log:entry (server log stream)',
        '- system:metrics (periodic metrics snapshot)',
        '- system:alert (system warnings/errors)'
      ].join('\n')
    },
    servers: baseUrl ? [{ url: baseUrl }] : [],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        PrepStats: { type: 'object', description: 'War preparation statistics structure (dynamic fields).'},
        Assignment: { type: 'object', properties: { slot: { type: 'integer' }, tag: { type: 'string' }, name: { type: 'string' }, weight: { type: 'number' } } },
        AssignmentsResult: { type: 'object', properties: { algorithm: { type: 'string' }, assignments: { type: 'array', items: { $ref: '#/components/schemas/Assignment' } }, generatedAt: { type: 'string', format: 'date-time' } } },
        PaginatedWarLog: { type: 'object', properties: { success: { type: 'boolean' }, page: { type: 'integer' }, pageSize: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' }, hasNext: { type: 'boolean' }, hasPrev: { type: 'boolean' }, data: { type: 'array', items: { type: 'object' } } } }
      }
    },
    paths
  };
}
