import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ambassador Outreach Platform',
  description: 'Discover, evaluate, and connect with brand ambassadors on Instagram',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <div className="min-h-screen flex">
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-lg font-bold text-brand-700">Ambassador Scout</h1>
              <p className="text-xs text-gray-500 mt-1">Find your next brand partner</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/candidates" label="Weekly Candidates" />
              <NavLink href="/outreach" label="Outreach Pipeline" />
              <NavLink href="/history" label="History &amp; Archive" />
              <NavLink href="/settings" label="Settings" />
            </nav>
            <div className="p-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">v1.0 — MVP</p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center px-3 py-2 text-sm font-medium rounded-lg
                 text-gray-700 hover:bg-brand-50 hover:text-brand-700
                 transition-colors"
    >
      {label}
    </a>
  );
}
