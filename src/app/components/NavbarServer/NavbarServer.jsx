// src/app/components/NavbarServer.jsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Navbar from '../Navbar/Navbar';

export default async function NavbarServer() {
    const session = await getServerSession(authOptions); // Fetch server session
    return <Navbar session={session} />; // Pass session to Navbar
}
