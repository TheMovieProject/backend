// src/app/components/NavbarServer.jsx
import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import Navbar from '../Navbar/Navbar';

export default async function NavbarServer() {
    const session = await getAuthSession()
    return <Navbar session={session} />; // Pass session to Navbar
}
