import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card p-12 text-center max-w-lg mx-auto mt-12">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        404
      </p>
      <h1 className="font-display text-3xl mt-2">Page not found</h1>
      <p className="text-text-secondary mt-2">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        Back to search
      </Link>
    </div>
  );
}
