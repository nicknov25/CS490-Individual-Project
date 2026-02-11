import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <header className="page-header">
        <h1 className="page-title">
          <Link href="/">Home</Link>
        </h1>

      </header>
    </div>
  );
}

