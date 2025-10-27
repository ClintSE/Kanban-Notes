import Image from "next/image";
import Board from '../components/Board';
import ThemeSwitcher from '../components/ThemeSwitcher';
import Auth from '../components/Auth';
import Sidebar from '../components/Sidebar';
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="font-sans min-h-screen p-6 sm:p-12 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kanban Notes</h1>
        <div className="flex items-center gap-4">
          {/* <ThemeSwitcher /> */}
          
          <Auth />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex gap-6 overflow-x-hidden border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        {/* <Sidebar /> */}
        <div className="flex-1">
          <Board />
        </div>
      </main>
    </div>
  );
}
