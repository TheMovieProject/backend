import React from 'react'

  const Footer = () => {
    return (
      <footer className="bg-gray-900 text-white py-6 px-4 text-center">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          {/* Logo & Name */}
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-semibold">YourWebsite</h2>
            <p className="text-sm">&copy; {new Date().getFullYear()} All Rights Reserved.</p>
          </div>
  
          {/* Links */}
          <div className="flex space-x-6">
            <a href="/about" className="hover:underline">About</a>
            <a href="/contact" className="hover:underline">Contact</a>
            <a href="/privacy" className="hover:underline">Privacy</a>
          </div>
  
          {/* Social Media */}
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="hover:opacity-80">🔗 Facebook</a>
            <a href="#" className="hover:opacity-80">🐦 Twitter</a>
            <a href="#" className="hover:opacity-80">📸 Instagram</a>
          </div>
        </div>
      </footer>
    );
  };
  
  export default Footer;
  