import React from "react";
import Link from "next/link";
import { Github, Linkedin, Twitter, Heart } from "lucide-react";
import Image from "next/image";
import logo from '../../../../public/img/logo.png'

const Footer = () => {
  const navLinks = [
    { href: "/home", label: "Home" },
    { href: "/movies", label: "Movies" },
    { href: "/write", label: "Write" },
    // { href: "/profile", label: "Profile" },
    // { href: "/watchlist", label: "Watchlist" },
    // { href: "/liked", label: "Liked" },
  ];

  return (
    <footer className="backdrop-blur-xl border-t border-white/10 py-12 px-4">
      <div className="max-w-[1200px] mx-auto">
        {/* Main Footer Content - Navbar Style Layout */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-8">
          
          {/* Brand Section - Left */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-600 to-orange-600 rounded-full flex items-center justify-center">
                <Image 
                src={logo} 
                alt="Movie Project Logo" 
                width={16} 
                height={16} 
              />
              </div>
              <h2 className="text-2xl font-light tracking-widest text-white">
                MOVIE PROJECT
              </h2>
            </div>
            <p className="text-sm text-white/60 font-light">
              Built with <Heart className="inline w-4 h-4 text-red-500 fill-current" /> 
            </p>
          </div>

          {/* Navigation Links - Center */}
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className="text-white/70 hover:text-white transition-colors duration-300 font-light tracking-wide relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          {/* Social Media - Right */}
          {/* <div className="flex justify-center lg:justify-end gap-4">
            <a
              href="https://github.com/Aditya30december2003"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-white/20 hover:border-white/40 hover:bg-white/5 rounded-sm transition-all duration-300 group"
            >
              <Github className="h-4 w-4 text-white/70 group-hover:text-white" />
            </a>
            <a
              href="https://www.linkedin.com/in/aditya-jain"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-white/20 hover:border-white/40 hover:bg-white/5 rounded-sm transition-all duration-300 group"
            >
              <Linkedin className="h-4 w-4 text-white/70 group-hover:text-white" />
            </a>
            <a
              href="https://twitter.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 border border-white/20 hover:border-white/40 hover:bg-white/5 rounded-sm transition-all duration-300 group"
            >
              <Twitter className="h-4 w-4 text-white/70 group-hover:text-white" />
            </a>
          </div> */}
        </div>

        {/* Bottom Bar - Similar to Navbar */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            {/* Copyright */}
            <div className="text-white/40 font-light tracking-wide text-center md:text-left">
              © {new Date().getFullYear()} Movie Project. All Rights Reserved.
            </div>

            {/* Additional Links */}
            {/* <div className="flex flex-wrap justify-center gap-4 text-white/40 font-light">
              <Link href="/login" className="hover:text-white/60 transition-colors">
                Login
              </Link>
              <Link href="/signup" className="hover:text-white/60 transition-colors">
                Sign Up
              </Link>
              <Link href="/search" className="hover:text-white/60 transition-colors">
                Search
              </Link>
            </div> */}

            {/* Version/Build Info */}
            {/* <div className="text-white/30 font-light text-center md:text-right">
              v1.0.0 • Built with Next.js
            </div> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;