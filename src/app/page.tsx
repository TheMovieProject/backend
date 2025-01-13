import { getAuthSession } from "@/app/api/auth/[...nextauth]/options";
import HomePage from '@/app/(pages)/Home/Home'
import { redirect } from "next/navigation";
export default async function Home() {
   const session = await getAuthSession()
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="">
      <div className="">
       <HomePage />
      </div>
    </main>
  );
}
