export function Footer() {
  return (
    <footer className="border-t border-border mt-auto py-6 text-xs text-text-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          Riftboard isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of
          Riot Games or anyone officially involved in producing or managing League of Legends.
        </p>
        <p className="text-text-secondary">© {new Date().getFullYear()} Riftboard</p>
      </div>
    </footer>
  );
}
