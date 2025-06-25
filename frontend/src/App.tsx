import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MealPlanForm from './components/MealPlanForm';
import { MealPlanDisplay } from './components/MealPlanDisplay';

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/generate-meal-plan" element={<MealPlanForm />} />
          <Route path="/meal-plan" element={<MealPlanDisplay />} />
          <Route path="/" element={<MealPlanForm />} />
        </Routes>
      </Router>
  );
}

export default App; 