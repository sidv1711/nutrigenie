import { Target, ChefHat, List, Download } from "lucide-react"

const steps = [
  {
    icon: Target,
    title: "Set Your Goals",
    description: "Set your nutrition goals and dietary preferences",
    color: "from-green-500 to-green-600",
  },
  {
    icon: ChefHat,
    title: "AI Generates Plans",
    description: "AI generates personalized meal plans with recipes",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: List,
    title: "Get Grocery Lists",
    description: "Get optimized grocery lists with real-time pricing",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Download,
    title: "Export & Shop",
    description: "Export to your preferred grocery retailer",
    color: "from-purple-500 to-purple-600",
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How NutriGenie Works</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">From planning to shopping in just four simple steps</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="relative mb-6">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto`}
                  >
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>

              {/* Connector Arrow */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-green-400 to-green-600"></div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-green-600 border-t-2 border-b-2 border-t-transparent border-b-transparent"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
