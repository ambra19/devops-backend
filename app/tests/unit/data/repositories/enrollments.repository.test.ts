import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/data/clients/dynamodb.client', () => ({
  docClient: { send: vi.fn() },
}))

import {
  getEnrollmentsByStudent,
  enrollStudent,
  unenrollStudent,
  getEnrollmentsByCourse,
} from '../../../../src/data/repositories/enrollments.repository'
import { docClient } from '../../../../src/data/clients/dynamodb.client'

import type { Enrollment } from '../../../../src/shared/types'

const mockEnrollment: Enrollment = { studentID: 's1', courseID: 'c1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getEnrollmentsByStudent', () => {
  it('queries the Enrollments table by studentID and returns items', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockEnrollment] } as never)

    const result = await getEnrollmentsByStudent('s1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Enrollments',
      KeyConditionExpression: 'studentID = :sid',
      ExpressionAttributeValues: { ':sid': 's1' },
    })
    expect(result).toEqual([mockEnrollment])
  })

  it('returns an empty array when Items is undefined', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: undefined } as never)

    const result = await getEnrollmentsByStudent('s1')

    expect(result).toEqual([])
  })
})

describe('enrollStudent', () => {
  it('puts a new enrollment item into the Enrollments table', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await enrollStudent('s1', 'c1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Enrollments',
      Item: { studentID: 's1', courseID: 'c1' },
    })
  })
})

describe('unenrollStudent', () => {
  it('deletes the enrollment by composite key { studentID, courseID }', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await unenrollStudent('s1', 'c1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Enrollments',
      Key: { studentID: 's1', courseID: 'c1' },
    })
  })
})

describe('getEnrollmentsByCourse', () => {
  it('scans the Enrollments table filtered by courseID and returns items', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockEnrollment] } as never)

    const result = await getEnrollmentsByCourse('c1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Enrollments',
      FilterExpression: 'courseID = :cid',
      ExpressionAttributeValues: { ':cid': 'c1' },
    })
    expect(result).toEqual([mockEnrollment])
  })

  it('returns an empty array when Items is undefined', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: undefined } as never)

    const result = await getEnrollmentsByCourse('c1')

    expect(result).toEqual([])
  })
})
