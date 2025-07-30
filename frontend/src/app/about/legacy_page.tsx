export default function AboutPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">About NutriGenie</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Smart meal planning for a healthier you
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            NutriGenie is an AI-powered meal planning application that helps you create personalized meal plans
            that fit your dietary needs, preferences, and budget.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                Personalized Plans
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Get meal plans tailored to your dietary preferences, restrictions, and nutritional needs.
                  Our AI takes into account your activity level and health goals.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                Budget-Friendly
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Stay within your budget while eating healthy. We optimize your meal plans to give you the
                  best nutrition for your money.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                Smart Shopping
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Get smart shopping lists and find the best deals at stores near you. Save time and money
                  while shopping for your ingredients.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
} 