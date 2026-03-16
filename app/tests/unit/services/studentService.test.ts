import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/data/repositories/users.repository')
vi.mock('../../../src/data/repositories/courses.repository')
vi.mock('../../../src/data/repositories/enrollments.repository')
vi.mock('../../../src/data/repositories/attendance.repository')

import {
  getEnrollmentPageData,
  getAttendanceForStudent,
  enroll,
  unenroll,
} from '../../../src/services/studentService'
import * as usersRepo from '../../../src/data/repositories/users.repository'
import * as coursesRepo from '../../../src/data/repositories/courses.repository'
import * as enrollmentsRepo from '../../../src/data/repositories/enrollments.repository'
import * as attendanceRepo from '../../../src/data/repositories/attendance.repository'

import type { Course, Enrollment, Attendance, User } from '../../../src/shared/types'

const mockStudent: User = { userID: 's1', name: 'Alice', role: 'student', departmentID: 'd1' }

const mockAllCourses: Course[] = [
  { courseID: 'c1', name: 'Algorithms', departmentID: 'd1' },
  { courseID: 'c2', name: 'Databases', departmentID: 'd1' },
  { courseID: 'c3', name: 'Networking', departmentID: 'd1' },
]

const mockEnrollments: Enrollment[] = [
  { studentID: 's1', courseID: 'c1' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getEnrollmentPageData', () => {
  it('throws when the user is not found', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(undefined)

    await expect(getEnrollmentPageData('unknown')).rejects.toThrow('User not found: unknown')
  })

  it('correctly separates enrolled and available courses using Set logic', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(mockStudent)
    vi.mocked(coursesRepo.getCoursesByDepartment).mockResolvedValue(mockAllCourses)
    vi.mocked(enrollmentsRepo.getEnrollmentsByStudent).mockResolvedValue(mockEnrollments)

    const result = await getEnrollmentPageData('s1')

    expect(result.enrolledCourses).toHaveLength(1)
    expect(result.enrolledCourses[0].courseID).toBe('c1')

    expect(result.availableCourses).toHaveLength(2)
    expect(result.availableCourses.map((c) => c.courseID)).toEqual(['c2', 'c3'])
  })

  it('returns all courses as available when student has no enrollments', async () => {
    vi.mocked(usersRepo.getUserById).mockResolvedValue(mockStudent)
    vi.mocked(coursesRepo.getCoursesByDepartment).mockResolvedValue(mockAllCourses)
    vi.mocked(enrollmentsRepo.getEnrollmentsByStudent).mockResolvedValue([])

    const result = await getEnrollmentPageData('s1')

    expect(result.enrolledCourses).toHaveLength(0)
    expect(result.availableCourses).toHaveLength(3)
  })

  it('returns all courses as enrolled when student is in every course', async () => {
    const allEnrolled: Enrollment[] = mockAllCourses.map((c) => ({ studentID: 's1', courseID: c.courseID }))
    vi.mocked(usersRepo.getUserById).mockResolvedValue(mockStudent)
    vi.mocked(coursesRepo.getCoursesByDepartment).mockResolvedValue(mockAllCourses)
    vi.mocked(enrollmentsRepo.getEnrollmentsByStudent).mockResolvedValue(allEnrolled)

    const result = await getEnrollmentPageData('s1')

    expect(result.enrolledCourses).toHaveLength(3)
    expect(result.availableCourses).toHaveLength(0)
  })
})

describe('enroll', () => {
  it('delegates to enrollStudent with the correct arguments', async () => {
    vi.mocked(enrollmentsRepo.enrollStudent).mockResolvedValue(undefined)

    await enroll('s1', 'c1')

    expect(enrollmentsRepo.enrollStudent).toHaveBeenCalledWith('s1', 'c1')
  })
})

describe('unenroll', () => {
  it('delegates to unenrollStudent with the correct arguments', async () => {
    vi.mocked(enrollmentsRepo.unenrollStudent).mockResolvedValue(undefined)

    await unenroll('s1', 'c1')

    expect(enrollmentsRepo.unenrollStudent).toHaveBeenCalledWith('s1', 'c1')
  })
})

describe('getAttendanceForStudent', () => {
  it('correctly parses the courseId#date composite key', async () => {
    const mockRecords: Attendance[] = [
      { studentID: 's1', date_courseID: 'c1#2026-03-10', presence: true },
      { studentID: 's1', date_courseID: 'c2#2026-03-11', presence: false },
    ]
    vi.mocked(attendanceRepo.getAttendanceByStudent).mockResolvedValue(mockRecords)
    vi.mocked(coursesRepo.getCourseById)
      .mockResolvedValueOnce('Algorithms')
      .mockResolvedValueOnce('Databases')

    const result = await getAttendanceForStudent('s1')

    expect(result).toEqual([
      { course: 'Algorithms', date: '2026-03-10', presence: true },
      { course: 'Databases', date: '2026-03-11', presence: false },
    ])
  })

  it('falls back to courseId string when getCourseById returns undefined', async () => {
    const mockRecords: Attendance[] = [
      { studentID: 's1', date_courseID: 'c-unknown#2026-03-10', presence: true },
    ]
    vi.mocked(attendanceRepo.getAttendanceByStudent).mockResolvedValue(mockRecords)
    vi.mocked(coursesRepo.getCourseById).mockResolvedValue(undefined)

    const result = await getAttendanceForStudent('s1')

    expect(result[0].course).toBe('c-unknown')
  })

  it('returns an empty array when the student has no attendance records', async () => {
    vi.mocked(attendanceRepo.getAttendanceByStudent).mockResolvedValue([])

    const result = await getAttendanceForStudent('s1')

    expect(result).toEqual([])
  })
})
