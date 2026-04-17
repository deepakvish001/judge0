export interface LangInfo {
  id: number;
  name: string;
  monaco: string;
}

// Curated map of common Judge0 language IDs to Monaco modes
export const LANGUAGES: LangInfo[] = [
  { id: 71, name: 'Python (3.8.1)', monaco: 'python' },
  { id: 70, name: 'Python (2.7.17)', monaco: 'python' },
  { id: 63, name: 'JavaScript (Node 12.14.0)', monaco: 'javascript' },
  { id: 74, name: 'TypeScript (3.7.4)', monaco: 'typescript' },
  { id: 54, name: 'C++ (GCC 9.2.0)', monaco: 'cpp' },
  { id: 50, name: 'C (GCC 9.2.0)', monaco: 'c' },
  { id: 62, name: 'Java (OpenJDK 13.0.1)', monaco: 'java' },
  { id: 60, name: 'Go (1.13.5)', monaco: 'go' },
  { id: 73, name: 'Rust (1.40.0)', monaco: 'rust' },
  { id: 51, name: 'C# (Mono 6.6.0.161)', monaco: 'csharp' },
  { id: 68, name: 'PHP (7.4.1)', monaco: 'php' },
  { id: 72, name: 'Ruby (2.7.0)', monaco: 'ruby' },
];

export const langById = (id: number): LangInfo | undefined =>
  LANGUAGES.find((l) => l.id === id);
