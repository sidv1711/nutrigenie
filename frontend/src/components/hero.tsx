import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Hero() {
  return (
    <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Smart Meal Planning with{" "}
                <span className="bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                  AI-Powered
                </span>{" "}
                Grocery Shopping
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Generate personalized meal plans, get real-time grocery prices, and export directly to your favorite
                stores
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg group">
                  Start Planning Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">300+</div>
                <div className="text-gray-600">Users Served</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">2,500+</div>
                <div className="text-gray-600">Meals Planned</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">$15K+</div>
                <div className="text-gray-600">Saved on Groceries</div>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="relative">
            <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8">
              <img
                src="/placeholder.svg?height=400&width=500"
                alt="NutriGenie App Interface"
                className="w-full h-auto rounded-2xl"
              />
            </div>
            {/* Background decorations */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-green-400 to-green-600 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full opacity-20 blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
