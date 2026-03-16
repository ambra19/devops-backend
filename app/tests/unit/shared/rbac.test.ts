import { describe, it, expect } from 'vitest'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import {
  roleFromCognitoGroups,
  getRoleFromEvent,
  forbidden,
  DEFAULT_ROLE,
} from '../../../src/shared/rbac'

describe('roleFromCognitoGroups', () => {
  it('returns the default role when groups is undefined', () => {
    expect(roleFromCognitoGroups(undefined)).toBe(DEFAULT_ROLE)
  })

  it('returns the default role when groups is an empty array', () => {
    expect(roleFromCognitoGroups([])).toBe(DEFAULT_ROLE)
  })

  it('returns student when only Students group is present', () => {
    expect(roleFromCognitoGroups(['Students'])).toBe('student')
  })

  it('returns teacher when only Teachers group is present', () => {
    expect(roleFromCognitoGroups(['Teachers'])).toBe('teacher')
  })

  it('returns admin when only Admins group is present', () => {
    expect(roleFromCognitoGroups(['Admins'])).toBe('admin')
  })

  it('respects precedence: admin wins over teacher and student', () => {
    expect(roleFromCognitoGroups(['Students', 'Teachers', 'Admins'])).toBe('admin')
  })

  it('respects precedence: teacher wins over student', () => {
    expect(roleFromCognitoGroups(['Students', 'Teachers'])).toBe('teacher')
  })

  it('returns default role for unknown group names', () => {
    expect(roleFromCognitoGroups(['SomeOtherGroup'])).toBe(DEFAULT_ROLE)
  })
})

describe('getRoleFromEvent', () => {
  function makeEvent(rawGroups: string | string[]): APIGatewayProxyEventV2WithJWTAuthorizer {
    return {
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              'cognito:groups': rawGroups,
            },
          },
        },
      },
    } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
  }

  it('resolves role from an array of Cognito groups', () => {
    expect(getRoleFromEvent(makeEvent(['Admins']))).toBe('admin')
    expect(getRoleFromEvent(makeEvent(['Teachers']))).toBe('teacher')
    expect(getRoleFromEvent(makeEvent(['Students']))).toBe('student')
  })

  it('resolves role from a bracket-style string (Cognito serialisation format)', () => {
    expect(getRoleFromEvent(makeEvent('[Admins]'))).toBe('admin')
    expect(getRoleFromEvent(makeEvent('[Teachers, Students]'))).toBe('teacher')
  })

  it('returns default role when the groups string is empty', () => {
    expect(getRoleFromEvent(makeEvent(''))).toBe(DEFAULT_ROLE)
  })

  it('handles precedence correctly when groups is an array with multiple entries', () => {
    expect(getRoleFromEvent(makeEvent(['Students', 'Admins']))).toBe('admin')
  })
})

describe('forbidden', () => {
  it('returns a 403 response with default message', () => {
    const response = forbidden()
    expect(response.statusCode).toBe(403)
    expect(response.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(response.body)).toEqual({ message: 'Forbidden' })
  })

  it('returns a 403 response with a custom message', () => {
    const response = forbidden('Access denied')
    expect(JSON.parse(response.body)).toEqual({ message: 'Access denied' })
  })
})
