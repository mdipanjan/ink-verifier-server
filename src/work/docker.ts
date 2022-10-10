import util from 'util'
import { exec, spawn } from 'node:child_process'
import { cliTable2Json } from 'cli-table-2-json'
import fs from 'node:fs'
import path from 'node:path'
import { FastifyBaseLogger } from 'fastify'

const MAX_CONTAINERS = process.env.MAX_CONTAINERS || 5
const VERIFIER_IMAGE = process.env.VERIFIER_IMAGE || 'ink-verifier:develop'
const CACHES_DIR = process.env.CACHES_DIR || path.resolve(__dirname, '../../tmp/caches')

const pexec = util.promisify(exec)

function splitLines (input: string): string[] {
  return input.replace(/\r/g, '').split('\n')
}

class Docker {
  log: FastifyBaseLogger

  constructor ({ log }: {log: FastifyBaseLogger}) {
    this.log = log
  }

  /**
   * TBD
   */
  run (processingDir: string) {
    // TODO empty errors

    const params = [
      'run',
      '--rm',
      '--cidfile', path.resolve(processingDir, 'cid'),
      '-v', `${processingDir}:/build`,
      '-v', `${path.resolve(CACHES_DIR, '.cache')}:/root/.cache`,
      '-v', `${path.resolve(CACHES_DIR, '.cargo', 'registry')}:/usr/local/cargo/registry`,
      '-v', `${path.resolve(CACHES_DIR, '.rustup')}:/usr/local/rustup`,
      VERIFIER_IMAGE
    ]

    const out = fs.openSync(path.resolve(processingDir, 'out.log'), 'a')
    const err = fs.openSync(path.resolve(processingDir, 'out.log'), 'a')

    const p = spawn('docker', params, {
      detached: true,
      stdio: ['ignore', out, err]
    })

    this.log.info(`Running verification: pid=${p.pid}`)

    p.on('close', (code) => {
      // TODO: Move from processing to if OK verfieds/ in NOK errors/
      // double check pristine before moving, downloading it again, just in case
      // compromised and ring alarms if not ??
      this.log.info(`child process exited with code ${code}`)
    })
  }

  async ps () {
    const { stdout } = await pexec('docker ps')
    const lines = splitLines(stdout)
    return cliTable2Json(lines)
  }

  async canRunMore () {
    const list = await this.ps()
    return list.length <= MAX_CONTAINERS
  }
}

export default Docker
