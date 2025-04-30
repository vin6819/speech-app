"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { name: "Speech Analysis", href: "/speech-analysis" },
  { name: "Text to Speech", href: "/text-to-speech" },
  { name: "Speech to Text", href: "/speech-to-text" },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className=" border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="text-xl font-bold">Speech App</div>
        <div className="flex space-x-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive ? "text-white font-semibold" : "text-gray-400 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
