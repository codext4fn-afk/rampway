export const metadata = {
  title: "RampWay",
  description: "AI job-application and local-opportunity assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
