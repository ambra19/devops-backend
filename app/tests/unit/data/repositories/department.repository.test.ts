import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/data/clients/dynamodb.client', () => ({
  docClient: { send: vi.fn() },
}))

import {
  getDepartmentById,
  getAllDepartments,
  createDepartment,
  deleteDepartment,
  renameDepartment,
} from '../../../../src/data/repositories/department.repository'
import { docClient } from '../../../../src/data/clients/dynamodb.client'

import type { Department } from '../../../../src/shared/types'

const mockDepartment: Department = { departmentID: 'd1', name: 'Computer Science' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getDepartmentById', () => {
  it('gets from the Departments table by departmentID and returns the name', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Item: { name: 'Computer Science' } } as never)

    const result = await getDepartmentById('d1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Departments',
      Key: { departmentID: 'd1' },
    })
    expect(result).toBe('Computer Science')
  })

  it('returns undefined when the department does not exist', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Item: undefined } as never)

    const result = await getDepartmentById('missing')

    expect(result).toBeUndefined()
  })
})

describe('getAllDepartments', () => {
  it('scans the entire Departments table and returns all items', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockDepartment] } as never)

    const result = await getAllDepartments()

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({ TableName: 'Departments' })
    expect(result).toEqual([mockDepartment])
  })

  it('returns an empty array when Items is undefined', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: undefined } as never)

    const result = await getAllDepartments()

    expect(result).toEqual([])
  })
})

describe('createDepartment', () => {
  it('puts a new item in the Departments table and returns the department object', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    const result = await createDepartment('Physics')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input.TableName).toBe('Departments')
    expect(call.input.Item).toMatchObject({ name: 'Physics' })
    expect(call.input.Item.departmentID).toMatch(/^dept-\d+$/)
    expect(result).toMatchObject({ name: 'Physics' })
    expect(result.departmentID).toMatch(/^dept-\d+$/)
  })
})

describe('deleteDepartment', () => {
  it('deletes the item from Departments by departmentID', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await deleteDepartment('d1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Departments',
      Key: { departmentID: 'd1' },
    })
  })
})

describe('renameDepartment', () => {
  it('updates the Departments table with the new name using reserved-word alias', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await renameDepartment('d1', 'CS Department')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Departments',
      Key: { departmentID: 'd1' },
      UpdateExpression: 'SET #n = :name',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': 'CS Department' },
    })
  })
})
