import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/data/clients/dynamodb.client', () => ({
  docClient: { send: vi.fn() },
}))

import {
  getAttendanceByStudentAndCourse,
  getAttendanceByStudent,
  markAttendance,
  markAttendanceBatch,
} from '../../../../src/data/repositories/attendance.repository'
import { docClient } from '../../../../src/data/clients/dynamodb.client'

import type { Attendance } from '../../../../src/shared/types'

const mockRecord: Attendance = { studentID: 's1', date_courseID: 'c1#2026-03-10', presence: true }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAttendanceByStudentAndCourse', () => {
  it('queries with a begins_with prefix on the courseId# composite key', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockRecord] } as never)

    const result = await getAttendanceByStudentAndCourse('s1', 'c1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Attendance',
      KeyConditionExpression: 'studentID = :studentId AND begins_with(date_courseID, :coursePrefix)',
      ExpressionAttributeValues: {
        ':studentId': 's1',
        ':coursePrefix': 'c1#',
      },
    })
    expect(result).toEqual([mockRecord])
  })
})

describe('getAttendanceByStudent', () => {
  it('queries the Attendance table by studentID and returns all records', async () => {
    vi.mocked(docClient.send).mockResolvedValue({ Items: [mockRecord] } as never)

    const result = await getAttendanceByStudent('s1')

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Attendance',
      KeyConditionExpression: 'studentID = :studentId',
      ExpressionAttributeValues: { ':studentId': 's1' },
    })
    expect(result).toEqual([mockRecord])
  })
})

describe('markAttendance', () => {
  it('puts an item with the courseId#date composite key and correct presence value', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await markAttendance('s1', 'c1', '2026-03-10', true)

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input).toMatchObject({
      TableName: 'Attendance',
      Item: {
        studentID: 's1',
        date_courseID: 'c1#2026-03-10',
        presence: true,
      },
    })
  })

  it('stores presence: false correctly', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await markAttendance('s1', 'c1', '2026-03-11', false)

    const call = vi.mocked(docClient.send).mock.calls[0][0]
    expect(call.input.Item.presence).toBe(false)
  })
})

describe('markAttendanceBatch', () => {
  it('calls markAttendance once per entry with the correct arguments', async () => {
    vi.mocked(docClient.send).mockResolvedValue({} as never)

    await markAttendanceBatch([
      { studentId: 's1', courseId: 'c1', date: '2026-03-10', presence: true },
      { studentId: 's2', courseId: 'c1', date: '2026-03-10', presence: false },
    ])

    expect(docClient.send).toHaveBeenCalledTimes(2)

    const firstItem = vi.mocked(docClient.send).mock.calls[0][0].input.Item
    expect(firstItem).toMatchObject({ studentID: 's1', date_courseID: 'c1#2026-03-10', presence: true })

    const secondItem = vi.mocked(docClient.send).mock.calls[1][0].input.Item
    expect(secondItem).toMatchObject({ studentID: 's2', date_courseID: 'c1#2026-03-10', presence: false })
  })
})
