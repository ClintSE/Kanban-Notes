import Image from "next/image";
import KanbanBoard from '../components/KanbanBoard';
import ThemeSwitcher from '../components/ThemeSwitcher';
import Auth from '../components/Auth';
import Sidebar from '../components/Sidebar';
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="font-sans min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-x-auto">
       <Sidebar />
      <header className="flex items-center justify-between mb-6 sticky top-0 z-50 bg-white h-[80px] px-10 border-b-2 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-2xl font-bold">SE Tasks Tracker</h1>
        <div className="flex items-center gap-4">
          {/* <ThemeSwitcher /> */}
          
          <Auth />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex gap-6 overflow-hidden overflow-x-auto = ml-[300px] ">
       
        <div className="flex-1">
          <KanbanBoard />
        </div>
      </main>
    </div>
  );
}
