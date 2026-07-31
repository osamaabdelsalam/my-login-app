import LoginForm from "@/components/auth/LoginForm";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}