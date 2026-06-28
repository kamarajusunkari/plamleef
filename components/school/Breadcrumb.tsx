"use client";
import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-[#7A869A] mb-4">
      <Link href="/school/dashboard" className="flex items-center hover:text-[#FF6B35] transition-colors">
        <Home size={12} />
      </Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={12} />
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="hover:text-[#FF6B35] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className={i === items.length - 1 ? "text-[#1A2035] font-medium" : ""}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
