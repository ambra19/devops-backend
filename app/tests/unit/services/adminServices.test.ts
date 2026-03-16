import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/data/repositories/courses.repository')
vi.mock('../../../src/data/repositories/department.repository')
vi.mock('../../../src/data/repositories/users.repository')

import {
  getAllCoursesWithDepartmentsAdmin,
  getAllStudentsAdmin,
  getAllTeachersAdmin,
  renameCourseAdmin,
  deleteCourseAdmin,
  removeCourseFromDepartmentAdmin,
  renameUserAdmin,
} from '../../../src/services/adminServices'
import * as coursesRepo from '../../../src/data/repositories/courses.repository'
import * as departmentRepo from '../../../src/data/repositories/department.repository'
import * as usersRepo from '../../../src/data/repositories/users.repository'

import type { Course, Department, User } from '../../../src/shared/types'

const mockCourses: Course[] = [
  { courseID: 'c1', name: 'Algorithms', departmentID: 'd1' },
  { courseID: 'c2', name: 'Databases', departmentID: 'd2' },
]

const mockDepartments: Department[] = [
  { departmentID: 'd1', name: 'Computer Science' },
  { departmentID: 'd2', name: 'Data Engineering' },
]

const mockUsers: User[] = [
  { userID: 'u1', name: 'Alice', role: 'student', departmentID: 'd1' },
  { userID: 'u2', name: 'Bob', role: 'teacher', departmentID: 'd1' },
  { userID: 'u3', name: 'Carol', role: 'admin', departmentID: 'd2' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAllCoursesWithDepartmentsAdmin', () => {
  it('merges department names into each course', async () => {
    vi.mocked(coursesRepo.getAllCourses).mockResolvedValue(mockCourses)
    vi.mocked(departmentRepo.getAllDepartments).mockResolvedValue(mockDepartments)

    const result = await getAllCoursesWithDepartmentsAdmin()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ courseID: 'c1', departmentName: 'Computer Science' })
    expect(result[1]).toMatchObject({ courseID: 'c2', departmentName: 'Data Engineering' })
  })

  it('falls back to departmentID when department is not found in the map', async () => {
    const courseWithUnknownDept: Course[] = [
      { courseID: 'c3', name: 'Physics', departmentID: 'unknown-dept' },
    ]
    vi.mocked(coursesRepo.getAllCourses).mockResolvedValue(courseWithUnknownDept)
    vi.mocked(departmentRepo.getAllDepartments).mockResolvedValue(mockDepartments)

    const result = await getAllCoursesWithDepartmentsAdmin()

    expect(result[0].departmentName).toBe('unknown-dept')
  })
})

describe('getAllStudentsAdmin', () => {
  it('returns only users with role student', async () => {
    vi.mocked(usersRepo.getAllUsers).mockResolvedValue(mockUsers)

    const result = await getAllStudentsAdmin()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })
})

describe('getAllTeachersAdmin', () => {
  it('returns only users with role teacher', async () => {
    vi.mocked(usersRepo.getAllUsers).mockResolvedValue(mockUsers)

    const result = await getAllTeachersAdmin()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bob')
  })
})

describe('renameCourseAdmin', () => {
  it('throws when the course is not found', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(undefined)

    await expect(renameCourseAdmin('Missing', 'NewName')).rejects.toThrow('Course not found: Missing')
  })

  it('calls renameCourse with the correct courseID and new name', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(mockCourses[0])
    vi.mocked(coursesRepo.renameCourse).mockResolvedValue(undefined)

    await renameCourseAdmin('Algorithms', 'Advanced Algorithms')

    expect(coursesRepo.renameCourse).toHaveBeenCalledWith('c1', 'Advanced Algorithms')
  })
})

describe('deleteCourseAdmin', () => {
  it('throws when the course is not found', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(undefined)

    await expect(deleteCourseAdmin('Ghost')).rejects.toThrow('Course not found: Ghost')
  })

  it('calls deleteCourse with the correct courseID', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(mockCourses[1])
    vi.mocked(coursesRepo.deleteCourse).mockResolvedValue(undefined)

    await deleteCourseAdmin('Databases')

    expect(coursesRepo.deleteCourse).toHaveBeenCalledWith('c2')
  })
})

describe('removeCourseFromDepartmentAdmin', () => {
  it('throws when the course is not found', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(undefined)

    await expect(removeCourseFromDepartmentAdmin('Ghost')).rejects.toThrow('Course not found: Ghost')
  })

  it('calls removeCourseFromDepartment with the correct courseID', async () => {
    vi.mocked(coursesRepo.getCourseByName).mockResolvedValue(mockCourses[0])
    vi.mocked(coursesRepo.removeCourseFromDepartment).mockResolvedValue(undefined)

    await removeCourseFromDepartmentAdmin('Algorithms')

    expect(coursesRepo.removeCourseFromDepartment).toHaveBeenCalledWith('c1')
  })
})

describe('renameUserAdmin', () => {
  it('throws when the user is not found', async () => {
    vi.mocked(usersRepo.getUserByName).mockResolvedValue(undefined)

    await expect(renameUserAdmin('Ghost', 'NewName')).rejects.toThrow('User not found: Ghost')
  })

  it('calls renameUser with the correct userID and new name', async () => {
    vi.mocked(usersRepo.getUserByName).mockResolvedValue(mockUsers[0])
    vi.mocked(usersRepo.renameUser).mockResolvedValue(undefined)

    await renameUserAdmin('Alice', 'Alicia')

    expect(usersRepo.renameUser).toHaveBeenCalledWith('u1', 'Alicia')
  })
})
