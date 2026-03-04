import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

export default function CentroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-3">
        <span className="text-lg font-semibold text-[#1E4A4A]">Orqestra</span>
      </header>
      {children}
    </div>
  );
}
