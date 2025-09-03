export default function PendingReviewPage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center text-center py-20">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        Application Submitted
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Thank you for submitting your documents. Your application is now pending review. We will notify you by email once a decision has been made.
      </p>
    </div>
  );
}