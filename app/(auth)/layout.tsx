export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-light p-4 dark:bg-canvas-dark">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary-300 to-mint flex items-center justify-center">
            <span className="text-sm font-bold text-primary-900">D</span>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
