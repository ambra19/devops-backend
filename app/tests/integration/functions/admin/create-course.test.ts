import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/data/clients/dynamodb.client', () => ({
  docClient: { send: vi.fn() },
}))

import { handler } from '../../../../src/functions/admin/courses/create-course'
import { docClient } from '../../../../src/data/clients/dynamodb.client'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

function makeEvent(
  groups: string | string[],
  body: Record<string, unknown> = {}
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            'cognito:groups': groups,
          },
        },
      },
    },
    body: JSON.stringify(body),
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /admin/courses — create-course handler', () => {
  it('returns 403 when the caller is not an admin', async () => {
    const event = makeEvent(['Students'], { name: 'Algorithms', departmentId: 'd1' })

    const response = await handler(event)

    expect(response.statusCode).toBe(403)
    expect(JSON.parse(response.body)).toMatchObject({ message: 'Forbidden' })
  })

  it('returns 400 when name is missing', async () => {
    const event = makeEvent(['Admins'], { departmentId: 'd1' })

    const response = await handler(event)

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toMatchObject({ error: 'name and departmentId are required' })
  })

  it('returns 400 when departmentId is missing', async () => {
    const event = makeEvent(['Admins'], { name: 'Algorithms' })

    const response = await handler(event)

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body)).toMatchObject({ error: 'name and departmentId are required' })
  })

  it('returns 201 with the created course when the request is valid', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    const event = makeEvent(['Admins'], { name: 'Algorithms', departmentId: 'd1' })

    const response = await handler(event)

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body).toMatchObject({ name: 'Algorithms', departmentID: 'd1' })
    expect(body.courseID).toMatch(/^course-\d+$/)
  })

  it('returns 500 when the DynamoDB call throws', async () => {
    vi.mocked(docClient.send).mockRejectedValue(new Error('DynamoDB unavailable'))

    const event = makeEvent(['Admins'], { name: 'Algorithms', departmentId: 'd1' })

    const response = await handler(event)

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.body)).toMatchObject({ error: 'DynamoDB unavailable' })
  })
})
