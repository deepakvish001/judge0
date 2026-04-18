import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getRuntime, type Runtime } from './runtime.js';

// Shared volume mounted at /sub inside this backend container AND at /code
// inside each sibling executor container (same Docker named volume). Must
// match the compose config; see docker-compose.native.yml.
const SANDBOX_VOLUME = process.env.SANDBOX_VOLUME ?? 'platform_sub';
const SANDBOX_MOUNT = process.env.SANDBOX_MOUNT ?? '/sub';
const DOCKER_BIN = process.env.DOCKER_BIN ?? 'docker';
const DEFAULT_CPU_LIMIT = process.env.EXEC_CPU_LIMIT ?? '1';
const DEFAULT_PIDS_LIMIT = process.env.EXEC_PIDS_LIMIT ?? '128';

export type Verdict =
  | 'AC'
  | 'WA'
  | 'TLE'
  | 'MLE'
  | 'RE'
  | 'CE'
  | 'IE';

export interface ExecOptions {
  languageId: number;
  sourceCode: string;
  stdin?: string;
  expectedOutput?: string;
  timeLimitSec?: number;
  memoryMb?: number;
}

export interface ExecResult {
  verdict: Verdict;
  status: { id: number; description: string };
  stdout: string;
  stderr: string;
  compileOutput: string | null;
  time: string | null; // seconds, string to match existing shape
  memory: number | null; // kb; null — Docker doesn't surface per-run peak cheaply
  exit_code: number | null;
}

// Judge0-compatible status ids so we don't have to change the grader.
const STATUS = {
  AC: { id: 3, description: 'Accepted' },
  WA: { id: 4, description: 'Wrong Answer' },
  TLE: { id: 5, description: 'Time Limit Exceeded' },
  CE: { id: 6, description: 'Compilation Error' },
  RE: { id: 11, description: 'Runtime Error' },
  IE: { id: 13, description: 'Internal Error' },
  MLE: { id: 14, description: 'Memory Limit Exceeded' },
};

export async function execCase(o: ExecOptions): Promise<ExecResult> {
  const rt = getRuntime(o.languageId);
  if (!rt) {
    return {
      verdict: 'IE',
      status: STATUS.IE,
      stdout: '',
      stderr: `unsupported language_id ${o.languageId}`,
      compileOutput: null,
      time: null,
      memory: null,
      exit_code: null,
    };
  }

  const timeLimit = Math.min(Math.max(o.timeLimitSec ?? 5, 1), 15);
  const memLimitMb = Math.min(Math.max(o.memoryMb ?? 256, 32), 1024);
  const subId = crypto.randomBytes(8).toString('hex');
  const hostDir = path.posix.join(SANDBOX_MOUNT, subId);

  try {
    await mkdir(hostDir, { recursive: true });
    await writeFile(path.join(hostDir, rt.filename), o.sourceCode);
    await writeFile(path.join(hostDir, 'stdin.txt'), o.stdin ?? '');

    // Compile (if needed)
    if (rt.compile) {
      const c = await dockerRun({
        image: rt.image,
        volume: SANDBOX_VOLUME,
        subId,
        cmd: rt.compile,
        timeoutSec: 30,
        memoryMb: 512,
        stdinPath: null,
        readOnly: false,
      });
      const compileErr = await readIfExists(
        path.join(hostDir, 'compile.err'),
      );
      const compileOutput = (compileErr || c.stderr || '').trim() || null;
      if (c.exitCode !== 0) {
        return {
          verdict: 'CE',
          status: STATUS.CE,
          stdout: '',
          stderr: c.stderr,
          compileOutput: compileOutput ?? 'Compilation failed',
          time: null,
          memory: null,
          exit_code: c.exitCode,
        };
      }
    }

    // Run
    const r = await dockerRun({
      image: rt.image,
      volume: SANDBOX_VOLUME,
      subId,
      cmd: rt.run,
      timeoutSec: timeLimit,
      memoryMb: memLimitMb,
      stdinPath: path.join(hostDir, 'stdin.txt'),
      readOnly: true,
    });

    const timeStr = (r.durationMs / 1000).toFixed(3);

    if (r.timedOut) {
      return {
        verdict: 'TLE',
        status: STATUS.TLE,
        stdout: r.stdout,
        stderr: r.stderr,
        compileOutput: null,
        time: timeStr,
        memory: null,
        exit_code: r.exitCode,
      };
    }
    if (r.oomKilled) {
      return {
        verdict: 'MLE',
        status: STATUS.MLE,
        stdout: r.stdout,
        stderr: r.stderr,
        compileOutput: null,
        time: timeStr,
        memory: memLimitMb * 1024,
        exit_code: r.exitCode,
      };
    }
    if (r.exitCode !== 0) {
      return {
        verdict: 'RE',
        status: STATUS.RE,
        stdout: r.stdout,
        stderr: r.stderr,
        compileOutput: null,
        time: timeStr,
        memory: null,
        exit_code: r.exitCode,
      };
    }

    // Grade against expected output (if provided). Trim trailing whitespace
    // on each line, drop trailing blank lines — the common LeetCode convention.
    if (o.expectedOutput !== undefined) {
      const ok = compareOutput(r.stdout, o.expectedOutput);
      return {
        verdict: ok ? 'AC' : 'WA',
        status: ok ? STATUS.AC : STATUS.WA,
        stdout: r.stdout,
        stderr: r.stderr,
        compileOutput: null,
        time: timeStr,
        memory: null,
        exit_code: r.exitCode,
      };
    }

    return {
      verdict: 'AC',
      status: STATUS.AC,
      stdout: r.stdout,
      stderr: r.stderr,
      compileOutput: null,
      time: timeStr,
      memory: null,
      exit_code: r.exitCode,
    };
  } catch (e) {
    return {
      verdict: 'IE',
      status: STATUS.IE,
      stdout: '',
      stderr: String((e as Error).message ?? e),
      compileOutput: null,
      time: null,
      memory: null,
      exit_code: null,
    };
  } finally {
    await rm(hostDir, { recursive: true, force: true }).catch(() => {});
  }
}

function normalize(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

function compareOutput(actual: string, expected: string): boolean {
  return normalize(actual) === normalize(expected);
}

async function readIfExists(p: string): Promise<string> {
  try {
    return (await readFile(p, 'utf8')).toString();
  } catch {
    return '';
  }
}

interface DockerRunOpts {
  image: string;
  volume: string;
  subId: string;
  cmd: string;
  timeoutSec: number;
  memoryMb: number;
  stdinPath: string | null;
  readOnly: boolean;
}

interface DockerRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  oomKilled: boolean;
  durationMs: number;
}

function dockerRun(o: DockerRunOpts): Promise<DockerRunResult> {
  return new Promise((resolve) => {
    const mountSuffix = o.readOnly ? ':ro' : '';
    const args = [
      'run',
      '--rm',
      '-i',
      '--network=none',
      `--memory=${o.memoryMb}m`,
      `--memory-swap=${o.memoryMb}m`,
      `--cpus=${DEFAULT_CPU_LIMIT}`,
      `--pids-limit=${DEFAULT_PIDS_LIMIT}`,
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '-v',
      `${o.volume}:/code${mountSuffix}`,
      '-w',
      `/code/${o.subId}`,
      o.image,
      'sh',
      '-lc',
      o.cmd,
    ];

    const start = Date.now();
    const child = spawn(DOCKER_BIN, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let stdoutBytes = 0;
    let stderrBytes = 0;
    const MAX = 256 * 1024;

    child.stdout.on('data', (b: Buffer) => {
      stdoutBytes += b.length;
      if (stdoutBytes <= MAX) stdout += b.toString('utf8');
    });
    child.stderr.on('data', (b: Buffer) => {
      stderrBytes += b.length;
      if (stderrBytes <= MAX) stderr += b.toString('utf8');
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, (o.timeoutSec + 1) * 1000);

    if (o.stdinPath) {
      import('node:fs').then(({ createReadStream }) => {
        const s = createReadStream(o.stdinPath!);
        s.on('error', () => child.stdin.end());
        s.pipe(child.stdin);
      });
    } else {
      child.stdin.end();
    }

    child.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      const oomKilled = code === 137 && !timedOut;
      if (stdoutBytes > MAX) stdout += '\n…[truncated]';
      if (stderrBytes > MAX) stderr += '\n…[truncated]';
      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
        oomKilled,
        durationMs,
      });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        stdout: '',
        stderr: `spawn failed: ${err.message}`,
        exitCode: null,
        timedOut: false,
        oomKilled: false,
        durationMs: Date.now() - start,
      });
    });
  });
}

// Expose for warm-up / pre-pull on boot.
export async function prePullImages(): Promise<void> {
  const { execFile } = await import('node:child_process');
  const images = Array.from(
    new Set(
      [71, 63, 54, 50, 62, 60]
        .map((id) => getRuntime(id)?.image)
        .filter(Boolean) as string[],
    ),
  );
  for (const img of images) {
    await new Promise<void>((resolve) => {
      execFile(DOCKER_BIN, ['image', 'inspect', img], (err) => {
        if (!err) return resolve();
        // Not present — pull in background, don't block boot on failure.
        execFile(DOCKER_BIN, ['pull', img], () => resolve());
      });
    });
  }
}
