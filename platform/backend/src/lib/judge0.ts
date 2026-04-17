import axios, { AxiosInstance } from 'axios';

const JUDGE0_URL = process.env.JUDGE0_URL ?? 'http://localhost:2358';
const JUDGE0_TOKEN = process.env.JUDGE0_TOKEN ?? '';

const client: AxiosInstance = axios.create({
  baseURL: JUDGE0_URL,
  timeout: 30_000,
  headers: JUDGE0_TOKEN ? { 'X-Auth-Token': JUDGE0_TOKEN } : {},
});

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const fromB64 = (s?: string | null) =>
  s ? Buffer.from(s, 'base64').toString('utf8') : '';

export interface Judge0Submission {
  language_id: number;
  source_code: string;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  callback_url?: string;
}

export interface Judge0Result {
  token: string;
  status: { id: number; description: string };
  stdout: string;
  stderr: string;
  compile_output: string;
  message: string;
  time: string | null;
  memory: number | null;
  exit_code: number | null;
}

export const judge0 = {
  async runSync(s: Judge0Submission): Promise<Judge0Result> {
    const { data } = await client.post(
      '/submissions?base64_encoded=true&wait=true',
      {
        language_id: s.language_id,
        source_code: b64(s.source_code),
        stdin: s.stdin ? b64(s.stdin) : undefined,
        expected_output: s.expected_output ? b64(s.expected_output) : undefined,
        cpu_time_limit: s.cpu_time_limit,
        memory_limit: s.memory_limit,
      },
    );
    return decodeResult(data);
  },

  async submitBatch(items: Judge0Submission[]): Promise<string[]> {
    const payload = {
      submissions: items.map((s) => ({
        language_id: s.language_id,
        source_code: b64(s.source_code),
        stdin: s.stdin ? b64(s.stdin) : undefined,
        expected_output: s.expected_output
          ? b64(s.expected_output)
          : undefined,
        cpu_time_limit: s.cpu_time_limit,
        memory_limit: s.memory_limit,
        callback_url: s.callback_url,
      })),
    };
    const { data } = await client.post(
      '/submissions/batch?base64_encoded=true',
      payload,
    );
    return (data as Array<{ token: string }>).map((d) => d.token);
  },

  async getBatch(tokens: string[]): Promise<Judge0Result[]> {
    const { data } = await client.get(
      `/submissions/batch?base64_encoded=true&tokens=${tokens.join(',')}&fields=token,status,stdout,stderr,compile_output,message,time,memory,exit_code`,
    );
    return (data.submissions as any[]).map(decodeResult);
  },

  async listLanguages(): Promise<
    Array<{ id: number; name: string; is_archived: boolean }>
  > {
    const { data } = await client.get('/languages/all');
    return data;
  },
};

function decodeResult(d: any): Judge0Result {
  return {
    token: d.token,
    status: d.status,
    stdout: fromB64(d.stdout),
    stderr: fromB64(d.stderr),
    compile_output: fromB64(d.compile_output),
    message: fromB64(d.message),
    time: d.time,
    memory: d.memory,
    exit_code: d.exit_code,
  };
}
