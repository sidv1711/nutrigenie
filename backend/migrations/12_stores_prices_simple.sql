-- 12_stores_prices_simple.sql
-- Simplified price table used by the mock price loader.

create table if not exists stores_prices (
    place_id text references stores(place_id) on delete cascade,
    ingredient_name text not null,
    unit text not null,
    price_per_unit numeric not null,
    last_seen_at timestamptz default timezone('utc', now()),
    primary key (place_id, ingredient_name, unit)
);

create index if not exists idx_stores_prices_ing on stores_prices(ingredient_name); 