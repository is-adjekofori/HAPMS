export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          HAPMS
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Hostel Asset and Property Management System — frontend scaffold.
        </p>
      </main>
    </div>
  );
}
