export default function Footer({ footerText }: { footerText: string }) {
  return (
    <footer className="border-t border-subtle bg-panel py-6 text-center text-sm text-muted">
      <div className="mx-auto max-w-6xl px-4">
        <p>
          {footerText} © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
