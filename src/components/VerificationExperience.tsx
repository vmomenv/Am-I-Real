export function VerificationExperience() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
          Groundflare
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          Groundflare Verification
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          The frontend shell is ready for the guided verification flow.
        </p>
        <audio className="mt-8 w-full" controls preload="metadata" src="/1.mp3">
          Your browser does not support the audio element.
        </audio>
      </section>
    </main>
  );
}
