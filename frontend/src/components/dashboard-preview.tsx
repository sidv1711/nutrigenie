import { Calendar, DollarSign, TrendingUp, Clock } from "lucide-react"

export default function DashboardPreview() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Your Personal Nutrition Command Center</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get a complete overview of your meal plans, nutrition goals, and grocery spending all in one place
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12">
          {/* Dashboard Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 pb-6 border-b border-gray-200">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, Sarah!</h3>
              <p className="text-gray-600">Here's your nutrition overview for this week</p>
            </div>
            <div className="flex gap-3 mt-4 lg:mt-0">
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">On Track</div>
              <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">Week 3</div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="text-green-600 text-sm font-medium">+12%</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">1,847</div>
              <div className="text-gray-600 text-sm">Calories Today</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <span className="text-orange-600 text-sm font-medium">-8%</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">$127</div>
              <div className="text-gray-600 text-sm">Budget Remaining</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <span className="text-blue-600 text-sm font-medium">5/7</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">5</div>
              <div className="text-gray-600 text-sm">Meals Planned</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <span className="text-purple-600 text-sm font-medium">2h</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">45m</div>
              <div className="text-gray-600 text-sm">Avg Cook Time</div>
            </div>
          </div>

          {/* Dashboard Preview Image */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
            <img
              src="/placeholder.svg?height=400&width=800"
              alt="NutriGenie Dashboard Preview"
              className="w-full h-auto rounded-xl shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
