import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export default async function DashboardPage() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: clerkUser.id,
    },
  });

  if (!user) {
    // This case should ideally not happen if webhooks are set up correctly
    return <div>User not found in DB.</div>;
  }

  return (
    <div className="px-8 py-12 sm:py-16 md:px-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <UserButton afterSignOutUrl="/" />
      </div>
      <div className="mt-8">
        <p>Welcome, {user.email}!</p>
        <p>Your Clerk ID is: {user.clerkId}</p>
        <p>You registered on: {user.createdAt.toLocaleDateString()}</p>
      </div>
    </div>
  );
} 