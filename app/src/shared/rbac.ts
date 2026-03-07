/**
 * Shared RBAC utilities — used by both frontend and Lambda.
 * Source of truth for role mapping and access control.
 */
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export type UserRole = 'student' | 'teacher' | 'admin'

/** Map Cognito group names (cognito:groups) to app roles. */
export const COGNITO_GROUP_TO_ROLE: Record<string, UserRole> = {
  Admins:   'admin',
  Students: 'student',
  Teachers: 'teacher',
}

export const DEFAULT_ROLE: UserRole = 'student'

/** Precedence when user is in multiple groups: first match wins. */
const ROLE_PRECEDENCE: UserRole[] = ['admin', 'teacher', 'student']

/**
 * Resolve a single app role from Cognito groups array.
 * Uses precedence: Admins > Teachers > Students.
 */
export function roleFromCognitoGroups(groups: string[] | undefined): UserRole {
  if (!groups || groups.length === 0) return DEFAULT_ROLE
  for (const r of ROLE_PRECEDENCE) {
    const groupName = Object.entries(COGNITO_GROUP_TO_ROLE).find(([, role]) => role === r)?.[0]
    if (groupName && groups.includes(groupName)) return r
  }
  return DEFAULT_ROLE
}

/**
 * Extract role from API Gateway v2 JWT authorizer event.
 * Use this in every Lambda that needs RBAC.
 *
 * @example
 * const role = getRoleFromEvent(event)
 * if (role !== 'admin') return forbidden()
 */
export function getRoleFromEvent(event: APIGatewayProxyEventV2WithJWTAuthorizer): UserRole {
  const claims = event.requestContext.authorizer.jwt.claims
  const raw = claims?.['cognito:groups']
  const groups = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
    ? [raw]
    : []
  return roleFromCognitoGroups(groups)
}

/** Shorthand 403 response */
export function forbidden(message = 'Forbidden') {
  return {
    statusCode: 403,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  }
}