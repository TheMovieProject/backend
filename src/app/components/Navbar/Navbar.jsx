'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Logout from '../Logout/Logout';
import { useSession } from 'next-auth/react';

const Navbar = () => {
    const [query, setQuery] = useState('');
    const { data: session, status } = useSession(); // Get session and status
    console.log(session);
    if (status === "loading") {
        // Show a loading state while the session is being fetched
        return <div>Loading...</div>;
    }
    return (
        <div>
            {!session ? (
                <ul>
                    <li><Link href='/login'>Login</Link></li>
                    <li><Link href='/signup'>Signup</Link></li>
                </ul>
            ) : (
                <ul className='flex items-center gap-3'>
                    <li><Link href='/' className='cursor-pointer'>Home</Link></li>
                    <li>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            type="text"
                            placeholder='Search a Movie...'
                        />
                        <Link href={`/search/${query}`}>
                            <button className='bg-red-400 border-white'>Search</button>
                        </Link>
                    </li>
                  <li>
                   <Link href='/watchlist' onClick={(e) => {
                   e.preventDefault(); // Prevent the default link behavior // Trigger a reload
                   window.location.href = '/watchlist';
                   }} className='cursor-pointer'>
                   WatchList
                  </Link>
                  </li>
                    <li className='cursor-pointer'>
                        <Link href='liked' onClick={(e) => {
                   e.preventDefault(); // Prevent the default link behavior // Trigger a reload
                   window.location.href = '/liked';
                   }}>
                         Liked/Film Collection
                        </Link>
                    </li>

                    <li className='cursor-pointer'>About</li>
                    <li className='cursor-pointer'>
                        <Link href='poll' onClick={(e) => {
                   e.preventDefault(); // Prevent the default link behavior // Trigger a reload
                   window.location.href = '/poll';
                   }}>
                         Poll
                        </Link>
                    </li>
                    <li><Link href='/profile' className='cursor-pointer'>Profile</Link></li>
                    <li className='cursor-pointer'><Link href='/write' className='cursor-pointer'>Write</Link></li>
                    <li><Logout /></li>
                </ul>
            )}
        </div>
    );
};

export default Navbar;
