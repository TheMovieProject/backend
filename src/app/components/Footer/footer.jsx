import React from "react";
import Link from "next/link";
import { Github, Linkedin, Twitter } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#0B0F14] text-white border-t border-white/10 py-8 px-4">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand / Logo */}
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold tracking-tight">Movie Project</h2>
          <p className="text-sm text-white/60">
            Built by <span className="font-medium text-white">Aditya Jain</span>
          </p>
          <p className="text-xs text-white/40 mt-1">
            © {new Date().getFullYear()} All Rights Reserved.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center md:justify-end gap-6 text-sm">
          <Link href="/about" className="hover:text-white/90 text-white/70">
            About
          </Link>
          <Link href="/contact" className="hover:text-white/90 text-white/70">
            Contact
          </Link>
          <Link href="/privacy" className="hover:text-white/90 text-white/70">
            Privacy
          </Link>
        </div>

        {/* Social Media */}
        <div className="flex justify-center md:justify-end gap-4">
          <a
            href="https://github.com/Aditya30december2003"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="https://www.linkedin.com/in/aditya-jain"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href="https://twitter.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white"
          >
            <Twitter className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
