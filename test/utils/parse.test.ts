import { describe, expect, it } from 'bun:test'
import {
    parseStringifiedDate,
    parseStringifiedValue,
    parseStringifiedObject
} from '../../src/utils/parse'

describe('parseStringifiedDate', () => {
    const isoDate = '2024-01-15T10:30:00.000Z'
    const shortDate = '01/05/2026'
    const formalDate =
        'Mon Jan 15 2024 10:30:00 GMT+0000 (Coordinated Universal Time)'

    it('should parse ISO8601 date by default', () => {
        const result = parseStringifiedDate(isoDate)
        expect(result).toBeInstanceOf(Date)
    })

    it('should parse short date format by default', () => {
        const result = parseStringifiedDate(shortDate)
        expect(result).toBeInstanceOf(Date)
    })

    it('should parse formal date format by default', () => {
        const result = parseStringifiedDate(formalDate)
        expect(result).toBeInstanceOf(Date)
    })

    it('should parse date when parseDate is true', () => {
        const result = parseStringifiedDate(isoDate, { parseDate: true })
        expect(result).toBeInstanceOf(Date)
    })

    it('should NOT parse date when parseDate is false', () => {
        const result = parseStringifiedDate(isoDate, { parseDate: false })
        expect(result).toBeNull()
    })

    it('should NOT parse short date when parseDate is false', () => {
        const result = parseStringifiedDate(shortDate, { parseDate: false })
        expect(result).toBeNull()
    })

    it('should parse date when parseDate is undefined', () => {
        const result = parseStringifiedDate(isoDate, { parseDate: undefined })
        expect(result).toBeInstanceOf(Date)
    })

    it('should return null for non-string values', () => {
        expect(parseStringifiedDate(123)).toBeNull()
        expect(parseStringifiedDate(null)).toBeNull()
        expect(parseStringifiedDate(undefined)).toBeNull()
    })

    it('should return null for non-date strings', () => {
        expect(parseStringifiedDate('hello')).toBeNull()
        expect(parseStringifiedDate('123456789')).toBeNull()
    })
})

describe('parseStringifiedValue', () => {
    const isoDate = '2024-01-15T10:30:00.000Z'

    it('should parse date strings by default', () => {
        const result = parseStringifiedValue(isoDate)
        expect(result).toBeInstanceOf(Date)
    })

    it('should parse date strings when parseDate is true', () => {
        const result = parseStringifiedValue(isoDate, { parseDate: true })
        expect(result).toBeInstanceOf(Date)
    })

    it('should NOT parse date strings when parseDate is false', () => {
        const result = parseStringifiedValue(isoDate, { parseDate: false })
        expect(result).toBe(isoDate)
    })

    it('should still parse numbers when parseDate is false', () => {
        expect(parseStringifiedValue('123', { parseDate: false })).toBe(123)
        expect(parseStringifiedValue('45.67', { parseDate: false })).toBe(
            45.67
        )
    })

    it('should still parse booleans when parseDate is false', () => {
        expect(parseStringifiedValue('true', { parseDate: false })).toBe(true)
        expect(parseStringifiedValue('false', { parseDate: false })).toBe(
            false
        )
    })

    it('should return empty string as is', () => {
        expect(parseStringifiedValue('')).toBe('')
    })

    it('should parse numbers by default', () => {
        expect(parseStringifiedValue('42')).toBe(42)
    })

    it('should parse booleans by default', () => {
        expect(parseStringifiedValue('true')).toBe(true)
        expect(parseStringifiedValue('false')).toBe(false)
    })
})

describe('parseStringifiedObject', () => {
    it('should parse dates inside objects by default', () => {
        const json = '{"date":"2024-01-15T10:30:00.000Z","name":"test"}'
        const result = parseStringifiedObject(json)

        expect(result.date).toBeInstanceOf(Date)
        expect(result.name).toBe('test')
    })

    it('should parse dates inside objects when parseDate is true', () => {
        const json = '{"date":"2024-01-15T10:30:00.000Z"}'
        const result = parseStringifiedObject(json, { parseDate: true })

        expect(result.date).toBeInstanceOf(Date)
    })

    it('should NOT parse dates inside objects when parseDate is false', () => {
        const json = '{"date":"2024-01-15T10:30:00.000Z","name":"test"}'
        const result = parseStringifiedObject(json, { parseDate: false })

        expect(result.date).toBe('2024-01-15T10:30:00.000Z')
        expect(result.name).toBe('test')
    })

    it('should handle nested objects with dates', () => {
        const json = '{"user":{"createdAt":"2024-01-15T10:30:00.000Z"}}'

        const withParsing = parseStringifiedObject(json, { parseDate: true })
        const withoutParsing = parseStringifiedObject(json, {
            parseDate: false
        })

        expect(withParsing.user.createdAt).toBeInstanceOf(Date)
        expect(withoutParsing.user.createdAt).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should handle arrays with dates', () => {
        const json =
            '{"dates":["2024-01-15T10:30:00.000Z","2024-02-20T15:00:00.000Z"]}'

        const withParsing = parseStringifiedObject(json, { parseDate: true })
        const withoutParsing = parseStringifiedObject(json, {
            parseDate: false
        })

        expect(withParsing.dates[0]).toBeInstanceOf(Date)
        expect(withParsing.dates[1]).toBeInstanceOf(Date)
        expect(withoutParsing.dates[0]).toBe('2024-01-15T10:30:00.000Z')
        expect(withoutParsing.dates[1]).toBe('2024-02-20T15:00:00.000Z')
    })
})
