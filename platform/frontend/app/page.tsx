import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-border bg-panel p-10 text-center">
        <h1 className="text-4xl font-bold">Practice. Compile. Compete.</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          A self-hosted coding-challenge platform powered by Judge0. Solve
          problems in 12+ languages, track submissions, and join contests.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/problems" className="btn-primary">
            Browse problems
          </Link>
          <Link href="/contests" className="btn">
            Join a contest
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h3 className="mb-2 text-lg font-semibold">12+ languages</h3>
          <p className="text-sm text-muted">
            Python, C++, Java, JavaScript, Rust, Go and more — all sandboxed by
            Judge0.
          </p>
        </div>
        <div className="card">
          <h3 className="mb-2 text-lg font-semibold">Hidden test cases</h3>
          <p className="text-sm text-muted">
            Each problem is graded against many hidden cases for verdicts like
            AC, WA, TLE.
          </p>
        </div>
        <div className="card">
          <h3 className="mb-2 text-lg font-semibold">Contests + leaderboards</h3>
          <p className="text-sm text-muted">
            Time-boxed contests with a live scoreboard ranked by points and
            submission time.
          </p>
        </div>
      </section>
    </div>
  );
}
