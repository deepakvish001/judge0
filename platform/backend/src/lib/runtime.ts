// Native language registry. Language IDs intentionally match Judge0's so
// existing seed data, StarterCode rows, and the frontend language picker
// keep working unchanged.
export interface Runtime {
  id: number;
  name: string;
  monaco: string;
  image: string;
  filename: string;
  // Shell snippet run inside the container, in /code/<sub>, before run.
  // Empty = no compile step.
  compile: string;
  // Shell snippet run inside the container, in /code/<sub>, at run time.
  run: string;
}

const RUNTIMES: Runtime[] = [
  {
    id: 71,
    name: 'Python 3',
    monaco: 'python',
    image: 'python:3.12-alpine',
    filename: 'main.py',
    compile: '',
    run: 'python3 main.py',
  },
  {
    id: 63,
    name: 'JavaScript (Node 20)',
    monaco: 'javascript',
    image: 'node:20-alpine',
    filename: 'main.js',
    compile: '',
    run: 'node main.js',
  },
  {
    id: 54,
    name: 'C++ 17 (g++)',
    monaco: 'cpp',
    image: 'gcc:13',
    filename: 'main.cpp',
    compile: 'g++ -O2 -std=c++17 main.cpp -o main 2>compile.err',
    run: './main',
  },
  {
    id: 50,
    name: 'C (gcc)',
    monaco: 'c',
    image: 'gcc:13',
    filename: 'main.c',
    compile: 'gcc -O2 -std=c11 main.c -o main 2>compile.err',
    run: './main',
  },
  {
    id: 62,
    name: 'Java 21',
    monaco: 'java',
    image: 'eclipse-temurin:21-jdk-alpine',
    filename: 'Main.java',
    compile: 'javac Main.java 2>compile.err',
    run: 'java Main',
  },
  {
    id: 60,
    name: 'Go 1.22',
    monaco: 'go',
    image: 'golang:1.22-alpine',
    filename: 'main.go',
    compile: '',
    run: 'go run main.go',
  },
];

export function getRuntime(id: number): Runtime | undefined {
  return RUNTIMES.find((r) => r.id === id);
}

export function listRuntimes() {
  return RUNTIMES.map(({ id, name, monaco }) => ({ id, name, monaco }));
}
