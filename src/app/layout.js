import "./globals.css";

export const metadata = {
  title: "Ketiejili District Dashboard",
  description: "Official enterprise management system for the Ketiejili District.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}