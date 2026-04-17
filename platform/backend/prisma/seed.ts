import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Judge0 default language ids (see seeds in judge0):
// 71 = Python (3.8.1), 63 = JavaScript (Node 12), 54 = C++ (GCC 9.2.0), 62 = Java
const PY = 71;
const JS = 63;
const CPP = 54;

async function main() {
  // Admin user
  const adminPass = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      email: 'admin@platform.local',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
    update: { role: 'ADMIN' },
  });

  // Demo user
  const demoPass = await bcrypt.hash('demo1234', 10);
  await prisma.user.upsert({
    where: { username: 'demo' },
    create: {
      username: 'demo',
      email: 'demo@platform.local',
      passwordHash: demoPass,
    },
    update: {},
  });

  // Tags
  const tagDefs = [
    { slug: 'array', name: 'Array' },
    { slug: 'hashing', name: 'Hashing' },
    { slug: 'string', name: 'String' },
    { slug: 'math', name: 'Math' },
    { slug: 'two-pointers', name: 'Two Pointers' },
  ];
  for (const t of tagDefs) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      create: t,
      update: { name: t.name },
    });
  }

  // Sample problems
  await upsertProblem({
    slug: 'sum-of-two',
    title: 'Sum of Two Numbers',
    difficulty: 'EASY',
    statementMd: `Read two integers \`a\` and \`b\` from stdin (single line, space separated) and print their sum.

**Input**
\`\`\`
1 2
\`\`\`

**Output**
\`\`\`
3
\`\`\``,
    constraintsMd: '`-10^9 <= a, b <= 10^9`',
    tags: ['math'],
    starter: {
      [PY]: `a, b = map(int, input().split())\nprint(a + b)\n`,
      [JS]: `const [a,b] = require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a+b);\n`,
      [CPP]: `#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b;}\n`,
    },
    cases: [
      { input: '1 2\n', expectedOutput: '3\n', isSample: true, order: 0 },
      { input: '10 -4\n', expectedOutput: '6\n', isSample: true, order: 1 },
      {
        input: '999999999 1\n',
        expectedOutput: '1000000000\n',
        isSample: false,
        order: 2,
      },
      {
        input: '-500 -500\n',
        expectedOutput: '-1000\n',
        isSample: false,
        order: 3,
      },
    ],
  });

  await upsertProblem({
    slug: 'reverse-string',
    title: 'Reverse a String',
    difficulty: 'EASY',
    statementMd: `Read a single line of input and print it reversed.

**Input**
\`\`\`
hello
\`\`\`

**Output**
\`\`\`
olleh
\`\`\``,
    tags: ['string'],
    starter: {
      [PY]: `print(input()[::-1])\n`,
      [JS]: `console.log(require('fs').readFileSync(0,'utf8').trim().split('').reverse().join(''));\n`,
      [CPP]: `#include <bits/stdc++.h>\nint main(){std::string s;std::cin>>s;std::reverse(s.begin(),s.end());std::cout<<s;}\n`,
    },
    cases: [
      { input: 'hello\n', expectedOutput: 'olleh\n', isSample: true, order: 0 },
      { input: 'abc\n', expectedOutput: 'cba\n', isSample: true, order: 1 },
      {
        input: 'racecar\n',
        expectedOutput: 'racecar\n',
        isSample: false,
        order: 2,
      },
    ],
  });

  await upsertProblem({
    slug: 'fizz-buzz',
    title: 'Fizz Buzz',
    difficulty: 'EASY',
    statementMd: `Read an integer \`n\` and print the FizzBuzz sequence from 1 to \`n\`, one number per line.
Print "Fizz" for multiples of 3, "Buzz" for multiples of 5, and "FizzBuzz" for multiples of both.`,
    tags: ['math'],
    starter: {
      [PY]: `n = int(input())\nfor i in range(1, n+1):\n    if i % 15 == 0: print("FizzBuzz")\n    elif i % 3 == 0: print("Fizz")\n    elif i % 5 == 0: print("Buzz")\n    else: print(i)\n`,
      [JS]: `const n = parseInt(require('fs').readFileSync(0,'utf8'));\nfor (let i=1;i<=n;i++){\n  if(i%15===0) console.log('FizzBuzz');\n  else if(i%3===0) console.log('Fizz');\n  else if(i%5===0) console.log('Buzz');\n  else console.log(i);\n}\n`,
    },
    cases: [
      {
        input: '5\n',
        expectedOutput: '1\n2\nFizz\n4\nBuzz\n',
        isSample: true,
        order: 0,
      },
      {
        input: '15\n',
        expectedOutput:
          '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n',
        isSample: false,
        order: 1,
      },
    ],
  });

  await upsertProblem({
    slug: 'two-sum-indices',
    title: 'Two Sum Indices',
    difficulty: 'MEDIUM',
    statementMd: `First line: \`n\` and target \`t\`. Second line: \`n\` integers.
Print the (1-indexed) indices i j (i<j) of two numbers that add up to \`t\`. If multiple answers exist, print the lexicographically smallest pair.`,
    tags: ['array', 'hashing'],
    starter: {
      [PY]: `import sys\ndata = sys.stdin.read().split()\nn, t = int(data[0]), int(data[1])\nnums = list(map(int, data[2:2+n]))\nseen = {}\nfor i, x in enumerate(nums):\n    if t - x in seen:\n        print(seen[t-x]+1, i+1)\n        break\n    seen.setdefault(x, i)\n`,
    },
    cases: [
      {
        input: '4 9\n2 7 11 15\n',
        expectedOutput: '1 2\n',
        isSample: true,
        order: 0,
      },
      {
        input: '3 6\n3 2 4\n',
        expectedOutput: '2 3\n',
        isSample: true,
        order: 1,
      },
      {
        input: '5 10\n1 5 4 6 9\n',
        expectedOutput: '2 4\n',
        isSample: false,
        order: 2,
      },
    ],
  });

  console.log('seed complete');
}

async function upsertProblem(opts: {
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statementMd: string;
  constraintsMd?: string;
  tags: string[];
  starter: Record<number, string>;
  cases: Array<{
    input: string;
    expectedOutput: string;
    isSample: boolean;
    order: number;
  }>;
}) {
  const tagRecords = await prisma.tag.findMany({
    where: { slug: { in: opts.tags } },
  });

  const existing = await prisma.problem.findUnique({
    where: { slug: opts.slug },
  });
  if (existing) {
    await prisma.starterCode.deleteMany({ where: { problemId: existing.id } });
    await prisma.testCase.deleteMany({ where: { problemId: existing.id } });
    await prisma.problemTag.deleteMany({ where: { problemId: existing.id } });
    await prisma.problem.update({
      where: { id: existing.id },
      data: {
        title: opts.title,
        difficulty: opts.difficulty,
        statementMd: opts.statementMd,
        constraintsMd: opts.constraintsMd,
        starterCodes: {
          create: Object.entries(opts.starter).map(([languageId, code]) => ({
            languageId: Number(languageId),
            code,
          })),
        },
        testCases: { create: opts.cases },
        tags: { create: tagRecords.map((t) => ({ tagId: t.id })) },
      },
    });
  } else {
    await prisma.problem.create({
      data: {
        slug: opts.slug,
        title: opts.title,
        difficulty: opts.difficulty,
        statementMd: opts.statementMd,
        constraintsMd: opts.constraintsMd,
        starterCodes: {
          create: Object.entries(opts.starter).map(([languageId, code]) => ({
            languageId: Number(languageId),
            code,
          })),
        },
        testCases: { create: opts.cases },
        tags: { create: tagRecords.map((t) => ({ tagId: t.id })) },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
