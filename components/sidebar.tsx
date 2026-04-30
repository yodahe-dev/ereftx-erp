"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Layers,
  PackageOpen,
  ShoppingCart,
  ChartColumn,
  Tags,
  Boxes,
  Beer,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navigation = [
  {
    label: "Dashboard",
    href: "/",
    icon: Sparkles,
    color: "from-amber-400 to-orange-400",
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    color: "from-emerald-400 to-teal-400",
  },
  {
    label: "Stocks",
    href: "/stocks",
    icon: Layers,
    color: "from-blue-400 to-cyan-400",
  },
  {
    label: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    color: "from-rose-400 to-pink-400",
  },
  {
    label: "Categories",
    href: "/categories",
    icon: Tags,
    color: "from-purple-400 to-violet-400",
  },
  {
    label: "Brands",
    href: "/brands",
    icon: Boxes,
    color: "from-yellow-400 to-amber-400",
  },
  {
    label: "Packagings",
    href: "/packagings",
    icon: PackageOpen,
    color: "from-cyan-400 to-blue-400",
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        className="relative flex flex-col h-screen border-r bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 shadow-2xl"
      >
        {/* Logo / Collapse Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Beer className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">
                  BevERP
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href} className="block">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-slate-800 text-white shadow-lg shadow-slate-900/50"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      )}
                    >
                      <div
                        className={cn(
                          "relative flex items-center justify-center h-8 w-8 rounded-lg transition-colors",
                          isActive
                            ? `bg-gradient-to-br ${item.color} shadow-lg`
                            : "bg-slate-700/50 group-hover:bg-slate-700"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 transition-transform",
                            isActive ? "text-white scale-110" : "text-slate-300"
                          )}
                        />
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-white border-2 border-slate-900"
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        )}
                      </div>
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="truncate"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700/50 p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Sparkles className="h-3 w-3" />
                {!collapsed && <span>v1.0 · Caffeine powered</span>}
              </div>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">BevERP v1.0</TooltipContent>
            )}
          </Tooltip>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}