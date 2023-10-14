import { readFileSync } from 'fs'
import * as core from '@actions/core'
import { exec } from '@actions/exec'

const parser = require('libpg-query');

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    if (!process.env.GITHUB_BASE_REF) {
      throw new Error("this action can only be triggered using a pull_request");
    }

    const filesRaw: string = core.getInput('files', {required: true});
    core.debug("filesRaw: " + filesRaw)

    const filePaths: string[] = JSON.parse(filesRaw);

    for (const path of filePaths) {
      const oldFile = await getOldFileContent(path);
      const oldFP = await parser.fingerprint(oldFile);
      core.debug(path + "[old]: " + oldFP);

      const newFile = readFileSync(path);
      const newFP = await parser.fingerprint(newFile);
      core.debug(path + "[new]: " + newFP);
      
      if (newFP !== oldFP) {
        throw new Error(path + " has changed!");
      }
    }

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function getOldFileContent(path: string): Promise<string> {
  let oldFile = '';
  let stdErr = '';
  const command = `git show "${process.env.GITHUB_BASE_REF}:${path}"`;
  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        oldFile += data.toString();
      },
      stderr: (data: Buffer) => {
        stdErr += data.toString();
      }
    }
  }

  if (await exec(command, undefined, options) !== 0) {
    throw new Error("could not exec " + command, {cause: stdErr});
  }

  return oldFile;
}
