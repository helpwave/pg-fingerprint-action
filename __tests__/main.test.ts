/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'

// Mock the GitHub Actions core library
const getInputMock = jest.spyOn(core, 'getInput')
const setFailedMock = jest.spyOn(core, 'setFailed')

const runSpy = jest.spyOn(main, 'run')

describe('action', () => {
  beforeAll(() => {
    process.chdir('./__tests__/sample-repo')
  })

  beforeEach(() => {
    process.env.GITHUB_BASE_REF = 'main'
    jest.clearAllMocks()
  })

  it('works', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'files':
          return '["file.sql"]'
        default:
          return ''
      }
    })
    await main.run()

    expect(runSpy).toHaveReturned()
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('errors', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'files':
          return '["file.sql", "error.sql"]'
        default:
          return ''
      }
    })

    await main.run()

    expect(runSpy).toHaveReturned()
    expect(setFailedMock).toHaveBeenCalledWith('error.sql has changed!')
  })
})
