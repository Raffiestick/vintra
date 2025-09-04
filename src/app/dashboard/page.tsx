export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="container mx-auto flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Welcome to Your Dealer Dashboard
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          You have successfully logged in.
        </p>
      </div>
    </main>
  );
}
