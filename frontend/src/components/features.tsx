import { Brain, ShoppingCart, Share } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI Meal Planning",
    description: "RAG-enhanced meal plans tailored to your nutrition goals and dietary restrictions",
    color: "from-green-500 to-green-600",
  },
  {
    icon: ShoppingCart,
    title: "Smart Grocery Shopping",
    description: "Real-time pricing from Kroger, Walmart, and other major retailers",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: Share,
    title: "One-Click Export",
    description: "Export your shopping list directly to Instacart, Walmart, and more",
    color: "from-blue-500 to-blue-600",
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need for Smart Meal Planning
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powered by advanced AI technology to make your meal planning effortless and grocery shopping more efficient
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <div
                className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
