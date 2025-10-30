import "./globals.css";

export const metadata = {
  title: "Vectura",
  description: "Vectura app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}