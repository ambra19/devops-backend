import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/data/repositories/courses.repository')
vi.mock('../../../src/data/repositories/users.repository')
vi.mock('../../../src/data/repositories/enrollments.repository')
vi.mock('../../../src/data/repositories/attendance.repository')
vi.mock('../../../src/services/userService')

import {
  getCoursesByTeacher,
  getStudentsByCourse,
  markCourseAttendance,
} from '../../../src/services/teacherService'
import * as coursesRepo from '../../../src/data/repositories/courses.repository'
import * as usersRepo from '../../../src/data/repositories/users.repository'
import * as enrollmentsRepo from '../../../src/data/repositories/enrollments.repository'
import * as attendanceRepo from '../../../src/data/repositories/attendance.repository'
import * as userService from '../../../src/services/userService'

import type { Course, Enrollment, User } from '../../../src/shared/types'

const mockCourse: Course = { courseID: 'c1', name: 'Algorithms', departmentID: 'd1' }
const mockEnrollments: Enrollment[] = [
  { studentID: 's1', courseID: 'c1' },
  { studentID: 's2', courseID: 'c1' },
]
const mockUser: User = { userID: 's1', name: 'Alice', role: 'student', departmentID: 'd1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCoursesByTeacher', () => {
  it('returns course names for the teacher department', async () => {
    vi.mocked(userService.getUserDepartmentID).mockResolvedValue('d1')
    vi.mocked(coursesRepo.getCoursesByDepartment).mockResolvedValue([
      { courseID: 'c1', name: 'Algorithms', departmentID: 'd1' },
      { courseID: 'c2', name: 'Databases', departmentID: 'd1' },
    ])

    const result = await getCoursesByTeacher('teacher-1')

    expect(userService.getUserDepartmentID).toHaveBeenCalledWith('teacher-1')
    expect(coursesRepo.getCoursesByDepartment).toHaveBeenCalledWith('d1')
    expect(result).toEqual(['Algorithms', 'Databases'])
  })

  it('returns an empty array when the department has no courses', async () => {
    vi.mocked(userService.getUserDepartmentID).mockResolvedValue('d1')
    vi.mocked(coursesRepo.getCoursesByDepartment).mockResolvedValue([])

    const result = await getCoursesByTeacher('teacher-1')

    expect(result).toEqual([])
  })
})

describe('getStudentsByCourse', () => {
  it('throws when the course is not found', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(undefined)

    await expect(getStudentsByCourse('Ghost')).rejects.toThrow('Course not found: Ghost')
  })

  it('returns an empty array when the course has no enrollments', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(mockCourse)
    vi.mocked(enrollmentsRepo.getEnrollmentsByCourse).mockResolvedValue([])

    const result = await getStudentsByCourse('Algorithms')

    expect(result).toEqual([])
  })

  it('returns student names and departments for each enrollment', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(mockCourse)
    vi.mocked(enrollmentsRepo.getEnrollmentsByCourse).mockResolvedValue(mockEnrollments)
    vi.mocked(userService.getUserName).mockResolvedValueOnce('Alice').mockResolvedValueOnce('Bob')
    vi.mocked(userService.getUserDepartment).mockResolvedValueOnce('CS').mockResolvedValueOnce('CS')

    const result = await getStudentsByCourse('Algorithms')

    expect(result).toEqual([
      { name: 'Alice', department: 'CS' },
      { name: 'Bob', department: 'CS' },
    ])
  })
})

describe('markCourseAttendance', () => {
  it('throws when the course is not found', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(undefined)

    await expect(
      markCourseAttendance([{ courseName: 'Ghost', studentName: 'Alice', date: '2026-01-01', presence: true }])
    ).rejects.toThrow('Course not found: Ghost')
  })

  it('throws when the student is not found', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(mockCourse)
    vi.mocked(usersRepo.getUserByName).mockResolvedValue(undefined)

    await expect(
      markCourseAttendance([{ courseName: 'Algorithms', studentName: 'Ghost', date: '2026-01-01', presence: true }])
    ).rejects.toThrow('Student not found: Ghost')
  })

  it('calls markAttendance with correct arguments for each entry', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(mockCourse)
    vi.mocked(usersRepo.getUserByName).mockResolvedValue(mockUser)
    vi.mocked(attendanceRepo.markAttendance).mockResolvedValue(undefined)

    await markCourseAttendance([
      { courseName: 'Algorithms', studentName: 'Alice', date: '2026-03-10', presence: true },
    ])

    expect(attendanceRepo.markAttendance).toHaveBeenCalledWith('s1', 'c1', '2026-03-10', true)
  })
})
