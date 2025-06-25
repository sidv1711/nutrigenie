import pytest
from app.api.macros import MacroInput, compute_macros

@pytest.mark.parametrize(
    "age,gender,weight,height,activity,goal,expected_calories",
    [
        # Male, maintain weight, moderate activity
        (25, "male", 80.0, 180.0, "moderate", "maintain", 10),  # placeholder will compute
        # Female, lose weight, sedentary
        (30, "female", 65.0, 165.0, "sedentary", "lose_weight", 10),
    ],
)
def test_compute_macros_calories(age, gender, weight, height, activity, goal, expected_calories):
    """Ensure calories are within 1% of manual calculation."""
    inp = MacroInput(
        age=age,
        gender=gender,
        weight_kg=weight,
        height_cm=height,
        activity_level=activity,
        fitness_goal=goal,
    )

    calories, protein_g, carbs_g, fats_g = compute_macros(inp)

    # Manual computation
    base_bmr = 10 * weight + 6.25 * height - 5 * age
    bmr = base_bmr + 5 if gender == "male" else base_bmr - 161
    ACTIVITY_MULTIPLIERS = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "veryActive": 1.9,
    }
    GOAL_MULTIPLIERS = {
        "lose_weight": 0.85,
        "maintain": 1.0,
        "gain_muscle": 1.15,
    }
    manual_calories = int(bmr * ACTIVITY_MULTIPLIERS[activity] * GOAL_MULTIPLIERS[goal])

    assert abs(calories - manual_calories) <= 1

    # Macro gram checks add up (allow rounding tolerance)
    cals_from_macros = protein_g * 4 + carbs_g * 4 + fats_g * 9
    assert abs(cals_from_macros - calories) < 10  # within 10 kcal 