"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function FollowSuggestions() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch("/api/suggestions");
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSuggestions();
  }, []);

  if (!users.length) return null;

  return (
    <section className="rounded-xl bg-neutral-900/60 border border-neutral-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-neutral-100 font-semibold">Suggested for you</h3>
        {/* <Link href="/explore" className="text-sm text-neutral-400 hover:text-white">
          See all
        </Link> */}
      </div>
      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between">
            <Link href={`/profile/${u.id}`} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800">
                <Image
                  src={u.avatarUrl || "/img/profile.png"}
                  alt={u.username}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm text-white">{u.username}</p>
                <p className="text-xs text-neutral-400">
                  {u.followersCount} followers
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
