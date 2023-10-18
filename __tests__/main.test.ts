/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import * as main from '../src/main'
import { readFileSync } from 'fs'

// Mock the GitHub Actions core library
const getInputMock = jest.spyOn(core, 'getInput')
const setFailedMock = jest.spyOn(core, 'setFailed')
setFailedMock.mockImplementation(() => {}) // we dont want to fail if this test runs in an action
const getOctokitMock = jest.spyOn(github, 'getOctokit')

const fakeOctokit = {
  rest: {
    repos: {
      getContent: jest.fn() // test should mock this
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
getOctokitMock.mockImplementation(() => fakeOctokit as any)

const runSpy = jest.spyOn(main, 'run')

describe('action', () => {
  beforeAll(() => {
    process.chdir('./__tests__/sample-repo')
  })

  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = 'thisrepo/doesnot-exist'
    process.env.GITHUB_BASE_REF = 'main'

    fakeOctokit.rest.repos.getContent.mockImplementation(async ({ path }) => {
      const content = readFileSync(`${path}.old`).toString('base64')
      return {
        data: {
          type: 'file',
          content
        }
      }
    })

    jest.clearAllMocks()
  })

  it('works', async () => {
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'files':
          return '["file.sql"]'
        case 'github_token':
          return 'this_is_not_a_token'
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
