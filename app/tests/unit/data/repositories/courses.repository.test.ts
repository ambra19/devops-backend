import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/data/clients/dynamodb.client', () => ({
  docClient: { send: vi.fn() },
}))

import {
  getCoursesByDepartment,
  getCourseById,
  getAllCourses,
  getCourseByName,
  renameCourse,
  createCourse,
  deleteCourse,
  removeCourseFromDepartment,
} from '../../../../src/data/repositories/courses.repository'
import { docClient } from '../../../../src/data/clients/dynamodb.client'

import type { Course } from '../../../../src/shared/types'

const mockCourse: Course = { courseID: 'c1', name: 'Algorithms', departmentID: 'd1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCoursesByDepartment', () => {
  it('scans the Courses table filtered by departmentID and returns items', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockCourse] } as never)

    const result = await getCoursesByDepartment('d1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Courses',
      FilterExpression: 'departmentID = :did',
      ExpressionAttributeValues: { ':did': 'd1' },
    })
    expect(result).toEqual([mockCourse])
  })

  it('returns an empty array when Items is undefined', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: undefined } as never)

    const result = await getCoursesByDepartment('d1')

    expect(result).toEqual([])
  })
})

describe('getCourseById', () => {
  it('gets from the Courses table by courseID and returns the name', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Item: { name: 'Algorithms' } } as never)

    const result = await getCourseById('c1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Courses',
      Key: { courseID: 'c1' },
    })
    expect(result).toBe('Algorithms')
  })

  it('returns undefined when the item does not exist', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Item: undefined } as never)

    const result = await getCourseById('missing')

    expect(result).toBeUndefined()
  })
})

describe('getAllCourses', () => {
  it('scans the entire Courses table and returns all items', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockCourse] } as never)

    const result = await getAllCourses()

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({ TableName: 'Courses' })
    expect(result).toEqual([mockCourse])
  })
})

describe('getCourseByName', () => {
  it('scans with a name filter using the reserved-word alias #n and returns the first match', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockCourse] } as never)

    const result = await getCourseByName('Algorithms')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Courses',
      FilterExpression: '#n = :name',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': 'Algorithms' },
    })
    expect(result).toEqual(mockCourse)
  })

  it('returns undefined when no course matches', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [] } as never)

    const result = await getCourseByName('Ghost')

    expect(result).toBeUndefined()
  })
})

describe('renameCourse', () => {
  it('updates the Courses table with the new name using reserved-word alias', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await renameCourse('c1', 'Advanced Algorithms')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Courses',
      Key: { courseID: 'c1' },
      UpdateExpression: 'SET #n = :name',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: { ':name': 'Advanced Algorithms' },
    })
  })
})

describe('createCourse', () => {
  it('puts a new item in the Courses table and returns the course object', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    const result = await createCourse('Networking', 'd2')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input.TableName).toBe('Courses')
    expect(call.input.Item).toMatchObject({ name: 'Networking', departmentID: 'd2' })
    expect(call.input.Item.courseID).toMatch(/^course-\d+$/)
    expect(result).toMatchObject({ name: 'Networking', departmentID: 'd2' })
  })
})

describe('deleteCourse', () => {
  it('deletes the item from Courses by courseID', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await deleteCourse('c1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Courses',
      Key: { courseID: 'c1' },
    })
  })
})

describe('removeCourseFromDepartment', () => {
  it('updates the Courses table to remove the departmentID attribute', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await removeCourseFromDepartment('c1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Courses',
      Key: { courseID: 'c1' },
      UpdateExpression: 'REMOVE departmentID',
    })
  })
})
