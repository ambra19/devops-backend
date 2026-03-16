import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/data/repositories/users.repository')
vi.mock('../../../src/data/repositories/department.repository')

import { getUserDepartment, getUserName, getUserDepartmentID } from '../../../src/services/userService'
import * as usersRepo from '../../../src/data/repositories/users.repository'
import * as departmentRepo from '../../../src/data/repositories/department.repository'

import type { User } from '../../../src/shared/types'

const mockUser: User = { userID: 'u1', name: 'Alice', role: 'student', departmentID: 'd1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserName', () => {
  it('throws when the user is not found', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(undefined)

    await expect(getUserName('unknown')).rejects.toThrow('User not found: unknown')
  })

  it('returns the user name when the user exists', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(mockUser)

    const result = await getUserName('u1')

    expect(result).toBe('Alice')
  })
})

describe('getUserDepartmentID', () => {
  it('throws when the user is not found', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(undefined)

    await expect(getUserDepartmentID('unknown')).rejects.toThrow('User not found: unknown')
  })

  it('returns the departmentID when the user exists', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(mockUser)

    const result = await getUserDepartmentID('u1')

    expect(result).toBe('d1')
  })
})

describe('getUserDepartment', () => {
  it('throws when the user is not found', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(undefined)

    await expect(getUserDepartment('unknown')).rejects.toThrow('User not found: unknown')
  })

  it('returns the department name when found', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(mockUser)
    vi.mocked(departmentRepo.getDepartmentById).mockResolvedValue('Computer Science')

    const result = await getUserDepartment('u1')

    expect(result).toBe('Computer Science')
  })

  it('falls back to departmentID when the department name is not found', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(mockUser)
    vi.mocked(departmentRepo.getDepartmentById).mockResolvedValue(undefined)

    const result = await getUserDepartment('u1')

    expect(result).toBe('d1')
  })
})
