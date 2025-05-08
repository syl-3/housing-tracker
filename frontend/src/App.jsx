import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Explore from "./pages/Explore";
import Insights from "./pages/Insights";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import { useState } from "react";
import { toast } from 'sonner'
import { useLocation } from "react-router-dom";



const toastMessages = [
"🧪 The only thing I trust is fresh data -- preferably scraped at dawn.",
"🔓 There is no API key. I am the access.",
"🧠 I think in scatter plots. I dream in bar charts.",
"🔍 Some call me a logo. My friends call me Red.",
"🕶️ Name’s Red. Trends call me when they’re lost.",
"Dedicated to Liz & Romeo!",
"🎮 Up, up, down, down, left, right, flap, rent.",
"🚨 See that deal? You’re welcome.",
"🌆 Des Moines? I’ve mapped it blindfolded.",
"📡 I hear price changes before they echo.",
"🥱 Light packer. Heavy lifter. Rent sniffer.",
"📸 Blink, and you’ll miss a deal. I won’t.",
"🦴 Scraped almost 1000 listings today. What did you do?",
"🛰️ I don't follow listings. Listings follow me.",
"💬 Birds talk. Redwing confirms.",
"🛸 If the rent’s out there, I’m already circling it.",
"🦅 My wingspan? Classified.",
"🕊️ 93% of birds fake their listings. Redwing doesn’t.",
"🕶️ Other trackers use AI. I use instinct.",
"🧠 I track listings with 2% of my brain. The rest writes haiku.",
"🐛 I only eat early worms. Better deals.",
"🧬 I’m 98% bird, 2% data compression.",
"🧊 Cooler than a rent freeze.",
"🎯 I don’t guess. I know. You guess.",
"🪶 Yes, I’m just a logo. No, I won’t stop acting like the main character.",
"🔁 Statistically speaking, you’ll click me again.",
"🏠 Even if Zillow had wings, it still couldn’t keep up.",
"🏁 You’re late. I already flapped through this ZIP.",
"🪶 Some birds migrate. Me? I just pivot.",
"🧬 Built different. Literally. I’m a data aviary.",
"🧠 My intelligence isn’t artificial. It’s avian.",
"📍 Built for Des Moines. Operating far above it.",
"📦 2B+ listings? Big nest energy.",
"🔍 Search bar? Please. I am the filter.",
"🏙️ Ranked your neighborhoods. Because not all nests are created equal.",
"📉 Trend lines like these? I’d nest here.",
"📢 I don’t job hunt. But the guy who made me? He’s on the market.",
"💼 The bird's polished. Imagine the guy who built me.",
"🐛 That wasn't a bug. Just my lunch. *BURP*",
"🎓 Graduated top of my roost.",
"🌎 One bird. One city. Endless listings.",
"🎨 UI so clean, it practically flies itself.",
"🧠 Smart enough to be humble. Cool enough to not bother.",
];

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function FlapLogo({ onClick }) {
  const logoRef = useRef(null);
  //const toggleRef = useRef(true); // true = flap, false = spin
  //const spinDirectionRef = useRef(true); // true = clockwise, false = counterclockwise

  const handleClick = () => {
  if (!logoRef.current) return;

  const el = logoRef.current;
  el.classList.remove("animate-flap");
  void el.offsetWidth; // force reflow
  el.classList.add("animate-flap");

  if (onClick) onClick();
};


  return (
    <div className="relative">
      <img
        ref={logoRef}
        src="/redwing_logo_final.png"
        alt="Redwing logo"
        onClick={handleClick}
        className="h-10 w-10 cursor-pointer transition-transform"
      />
    </div>
  );
}





export default function App() {
const location = useLocation();
const shuffledRef = useRef(shuffleArray(toastMessages));
const indexRef = useRef(0);
const clickCounterRef = useRef(0);
const specialToastShown = useRef(false);

const triggerToast = () => {
  clickCounterRef.current++;

  if (clickCounterRef.current === 50 && !specialToastShown.current) {
    toast("👀 You’ve clicked 50 times. Be honest — are you really here for rentals?");
    specialToastShown.current = true;
    return;
  }

  const message = shuffledRef.current[indexRef.current];
  toast(message, {
    duration: 3000,
    style: {
      background: 'white',
      border: '1px solid #e5e7eb',
      color: '#1f2937',
      fontWeight: 500,
      fontSize: '0.875rem',
      borderRadius: '0.375rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      padding: '0.75rem 1rem',
      
    },
  });

  indexRef.current++;

  // Once we hit the end, reshuffle and reset index
  if (indexRef.current >= shuffledRef.current.length) {
    shuffledRef.current = shuffleArray(toastMessages);
    indexRef.current = 0;
  }
};



  return (
    
      <div className="min-h-screen flex flex-col bg-neutral-100 text-zinc-800">
        {/* Header: Persistent across all routes */}
        <header className="relative flex items-center justify-between px-6 py-4 border-b shadow-sm bg-white">
          <div className="flex items-center gap-2">
            <FlapLogo onClick={triggerToast} />
            <h1 className="text-2xl font-bold">
              <span className="text-red-600">Red</span>wing
            </h1>
          </div>
          <nav className="flex gap-4 text-sm font-medium text-zinc-700">
            <Link
  to="/"
  className={`${
    location.pathname === "/" ? "text-red-600" : "text-black hover:text-red-600"
  }`}
>
  Daily Brief
</Link>
            <Link
  to="/market_watch"
  className={`${
    location.pathname === "/market_watch" ? "text-red-600" : "text-black hover:text-red-600"
  }`}
>
  Market Watch
</Link>

            <Link
  to="/explore_nests"
  className={`${
    location.pathname === "/explore_nests" ? "text-red-600" : "text-black hover:text-red-600"
  }`}
>
  Explore Nests
</Link>
          </nav>
          

        </header>

        {/* Route content goes here */}
        <main className="flex-grow p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/market_watch" element={<Insights />} />
            <Route path="/explore_nests" element={<Explore />} />
          </Routes>
        </main>

  <footer className="text-center text-sm text-zinc-500 py-4 border-t bg-white">
  <span className="px-2 text-zinc-300"></span>
  <span className="text-zinc-800 font-medium">
    <span className="text-red-600">Red</span>wing is a rental tracker and data explorer built for Des Moines — based on Apartments.com listings, and built to help people find their nests.
  </span>
</footer>

      </div>
    
  );
}
