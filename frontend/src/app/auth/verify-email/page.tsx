export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email verification is not required
        </h2>
        <div className="mt-2 text-center text-sm text-gray-600">
          <p className="font-medium">
            Please <a href="/auth/signin" className="text-indigo-600 hover:text-indigo-500">sign in</a> to your account.
          </p>
        </div>
      </div>
    </div>
  )
} 