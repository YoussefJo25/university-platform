export default function Footer() {
  return (
    <footer className="bg-navy-dark py-6 text-center text-sm text-white/80">
      <div className="mx-auto max-w-6xl px-4">
        <p>جميع الحقوق محفوظة لجامعة المنيا الاهلية © {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
