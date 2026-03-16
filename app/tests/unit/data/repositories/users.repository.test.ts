import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/data/clients/dynamodb.client', () => ({
  docClient: { send: vi.fn() },
}))

import {
  getUserById,
  renameUser,
  getUserByName,
  getAllUsers,
} from '../../../../src/data/repositories/users.repository'
import { docClient } from '../../../../src/data/clients/dynamodb.client'

import type { User } from '../../../../src/shared/types'

const mockUser: User = { userID: 'u1', name: 'Alice', role: 'student', departmentID: 'd1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserById', () => {
  it('gets from the Users table by userID and returns the user', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Item: mockUser } as never)

    const result = await getUserById('u1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Users',
      Key: { userID: 'u1' },
    })
    expect(result).toEqual(mockUser)
  })

  it('returns undefined when the user does not exist', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Item: undefined } as never)

    const result = await getUserById('missing')

    expect(result).toBeUndefined()
  })
})

describe('renameUser', () => {
  it('updates the Users table with the new name using reserved-word alias', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await renameUser('u1', 'Alicia')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Users',
      Key: { userID: 'u1' },
      UpdateExpression: 'SET #n = :name',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': 'Alicia' },
    })
  })
})

describe('getUserByName', () => {
  it('scans the Users table with a name filter and returns the first match', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockUser] } as never)

    const result = await getUserByName('Alice')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Users',
      FilterExpression: '#n = :name',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': 'Alice' },
    })
    expect(result).toEqual(mockUser)
  })

  it('returns undefined when no user matches', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [] } as never)

    const result = await getUserByName('Ghost')

    expect(result).toBeUndefined()
  })
})

describe('getAllUsers', () => {
  it('scans the entire Users table and returns all items', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockUser] } as never)

    const result = await getAllUsers()

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({ TableName: 'Users' })
    expect(result).toEqual([mockUser])
  })

  it('returns an empty array when Items is undefined', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: undefined } as never)

    const result = await getAllUsers()

    expect(result).toEqual([])
  })
})
