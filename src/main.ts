import { readFileSync } from 'fs'
import * as core from '@actions/core'
import { GitHub } from '@actions/github/lib/utils'
import { getOctokit, context } from '@actions/github'
import * as parser from 'libpg-query'
import { join } from 'path'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    if (!process.env.GITHUB_BASE_REF) {
      throw new Error('this action can only be triggered using a pull_request')
    }

    const gh_token = core.getInput('github_token')
    if (!gh_token) {
      throw new Error('no github_token provided!')
    }
    const octokit = getOctokit(gh_token)

    const root = core.getInput('root') || '.'
    core.debug(`root: ${root}`)

    const filesRaw: string = core.getInput('files', { required: true })
    core.debug(`filesRaw: ${filesRaw}`)

    const filePaths: string[] = parseFiles(root, filesRaw)
    core.debug(`filePaths: ${filePaths}`)

    for (const path of filePaths) {
      const oldFile = await getOldFileContent(octokit, path)
      core.debug(`${path}[old]: ${oldFile}`)
      const oldFP = await parser.fingerprint(oldFile)
      core.info(`${path}[old]: ${oldFP}`)

      const newFile = readFileSync(path).toString()
      core.debug(`${path}[new]: ${newFile}`)
      const newFP = await parser.fingerprint(newFile)
      core.info(`${path}[new]: ${newFP}`)

      if (newFP !== oldFP) {
        throw new Error(`${path} has changed!`)
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function getOldFileContent(
  octokit: InstanceType<typeof GitHub>,
  path: string
): Promise<string> {
  const ref = process.env.GITHUB_BASE_REF // guaranteed to exist (checked in run())

  const { data } = await octokit.rest.repos.getContent({
    path,
    ref,
    ...context.repo
  })

  if (!data) {
    throw new Error(`could not fetch old version of ${path} on ${ref}`)
  }

  if (Array.isArray(data)) {
    throw new Error(`file was a directory: ${path} on ${ref}`)
  }

  if (data.type !== 'file') {
    throw new Error(`was not a file: ${path} on ${ref}`)
  }

  return Buffer.from(data.content, 'base64').toString('utf8')
}

function parseFiles(root: string, filesRaw: string): string[] {
  const arr = JSON.parse(filesRaw)
  return arr.map((p: string) => join(root, p))
}
