import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bibhup Mishra | Cloud Architect',
  description:
    'Principal Cloud and DevOps Architect specializing in Azure, Kubernetes, and enterprise platform modernization.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
