import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Explore from "./pages/Explore";
import Insights from "./pages/Insights";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-neutral-100 text-zinc-800">
        {/* Header: Persistent across all routes */}
        <header className="flex items-center justify-between px-6 py-4 border-b shadow-sm bg-white">
          <div className="flex items-center gap-2">
            <img src="/redwing_logo_final.png" alt="Redwing logo" className="h-8 w-8" />
            <h1 className="text-2xl font-bold">
              <span className="text-red-600">Red</span>wing
            </h1>
          </div>
          <nav className="flex gap-4 text-sm font-medium text-zinc-700">
            <Link to="/" className="hover:text-red-600">Dashboard</Link>
            <Link to="/explore" className="hover:text-red-600">Explore</Link>
            <Link to="/insights" className="hover:text-red-600">Insights</Link>
          </nav>
        </header>

        {/* Route content goes here */}
        <main className="flex-grow p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/insights" element={<Insights />} />
          </Routes>
        </main>

  <footer className="text-center text-sm text-zinc-500 py-4 border-t bg-white">
  <span className="px-2 text-zinc-300"></span>
  <span className="text-zinc-800 font-medium">
    <span className="text-red-600">Red</span>wing is a rental tracker and data explorer built for Des Moines — based on Apartments.com listings, and built to help people find their nests.
  </span>
</footer>

      </div>
    </Router>
  );
}
