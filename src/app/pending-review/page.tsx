export default function PendingReviewPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Application Submitted</h1>
        <p className="max-w-md text-muted-foreground">
          Thank you for submitting your documents. Your application is now pending review. We will notify you by email once it has been approved.
        </p>
      </div>
    </main>
  );
}
