export default function Footer({ footerText }: { footerText: string }) {
  return (
    <footer className="bg-navy-dark py-6 text-center text-sm text-white/80">
      <div className="mx-auto max-w-6xl px-4">
        <p>
          {footerText} © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
