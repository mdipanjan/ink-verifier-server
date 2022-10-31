import Swagger, { JSONObject } from '@fastify/swagger'
import { FastifyInstance, FastifySchema } from 'fastify'
import { OAS_URL } from '../config'

export function transformSchema ({
  schema,
  url
}: {
  schema: FastifySchema,
  url: string
}) {
  if (url.startsWith('/upload')) {
    const {
      // we remove body from the schema
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      body,
      ...transformed
    } = schema
    const json = transformed as unknown as JSONObject
    json.body = {
      type: 'object',
      properties: {
        package: {
          format: 'binary',
          type: 'file',
          description: `The compressed archive expected by the
            [Verifier Image](https://github.com/web3labs/ink-verifier/blob/main/README.md)
            `
        }
      },
      required: ['package']
    }
    return { schema: json, url }
  } else {
    return { schema: schema as unknown as JSONObject, url }
  }
}

export default function registerOpenApi (server: FastifyInstance) {
  server.register(Swagger, {
    openapi: {
      info: {
        title: 'Ink Verification Service API',
        description: 'The ink! verification service api',
        version: '0.0.1'
      },
      servers: [{
        url: OAS_URL
      }]
    },
    // Workaround for proper multi-part OpenAPI docs
    transform: transformSchema
  })

  server.get('/oas.json', {
    schema: { hide: true },
    handler: function (req, reply) {
      return reply.send(server.swagger())
    }
  })
}
