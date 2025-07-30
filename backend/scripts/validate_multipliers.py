#!/usr/bin/env python
"""
Script to validate store price multipliers by sampling actual prices.
Run this periodically to ensure our multipliers are accurate.
"""

import asyncio
from typing import Dict, List, Tuple
from app.services.kroger import KrogerPriceSource
from app.services.aldi import AldiPriceSource
from app.services.price_research import get_research_based_multiplier

# Validation basket - common items to compare across stores
VALIDATION_BASKET = [
    "milk",
    "eggs", 
    "bread",
    "bananas",
    "chicken breast",
    "ground beef",
    "rice",
    "pasta",
    "yogurt",
    "cheese"
]

async def collect_price_samples():
    """Collect actual price samples to validate our multipliers."""
    
    # Initialize price sources
    kroger = KrogerPriceSource()
    # aldi = AldiPriceSource()  # When working
    
    results = {}
    
    print("Collecting price samples for validation...")
    print("=" * 50)
    
    for item in VALIDATION_BASKET:
        print(f"\nSampling prices for: {item}")
        
        # Get Kroger price (our baseline)
        kroger_price, _ = kroger.fetch_price("01100002", item, "each")  # Default Kroger store
        
        if kroger_price:
            results[item] = {
                "kroger": kroger_price,
                # "aldi": aldi.fetch_price("aldi_default", item, "each")[0],
            }
            print(f"  Kroger: ${kroger_price:.2f}")
        else:
            print(f"  Kroger: No data")
    
    return results

def calculate_observed_multipliers(price_data: Dict) -> Dict[str, float]:
    """Calculate actual multipliers from collected price data."""
    
    multipliers = {}
    
    for store in ["aldi"]:  # Add more stores as we get data
        store_prices = []
        kroger_prices = []
        
        for item, prices in price_data.items():
            if "kroger" in prices and store in prices:
                if prices["kroger"] and prices[store]:
                    kroger_prices.append(prices["kroger"])
                    store_prices.append(prices[store])
        
        if kroger_prices and store_prices:
            # Calculate average multiplier
            ratios = [store_p / kroger_p for store_p, kroger_p in zip(store_prices, kroger_prices)]
            avg_multiplier = sum(ratios) / len(ratios)
            multipliers[store] = avg_multiplier
    
    return multipliers

def compare_with_research(observed: Dict[str, float]):
    """Compare our observed multipliers with research data."""
    
    print("\nMultiplier Comparison:")
    print("=" * 50)
    print(f"{'Store':<15} {'Observed':<10} {'Research':<10} {'Difference':<10}")
    print("-" * 50)
    
    for store, obs_mult in observed.items():
        research_mult = get_research_based_multiplier(store, "combined")
        difference = abs(obs_mult - research_mult)
        
        print(f"{store:<15} {obs_mult:<10.3f} {research_mult:<10.3f} {difference:<10.3f}")
        
        if difference > 0.10:  # More than 10% difference
            print(f"  ⚠️  Large difference detected for {store}")

async def main():
    """Main validation script."""
    
    print("Store Price Multiplier Validation")
    print("=" * 50)
    
    # Collect actual price samples
    price_samples = await collect_price_samples()
    
    if not price_samples:
        print("No price data collected. Check store integrations.")
        return
    
    # Calculate observed multipliers
    observed_multipliers = calculate_observed_multipliers(price_samples)
    
    # Compare with research data
    compare_with_research(observed_multipliers)
    
    print("\nRecommendations:")
    print("-" * 30)
    print("• Run this validation monthly to keep multipliers accurate")
    print("• Update multipliers if observed differences > 10%")
    print("• Add more stores as price sources become available")

if __name__ == "__main__":
    asyncio.run(main())