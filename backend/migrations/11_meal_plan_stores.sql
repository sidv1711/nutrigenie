-- Link each meal plan to one or more grocery stores chosen by the user
create table if not exists meal_plan_stores (
    meal_plan_id uuid references meal_plans(id) on delete cascade,
    place_id text not null,
    primary key (meal_plan_id, place_id)
);

-- Ensure fast lookup by place_id (optional)
create index if not exists meal_plan_stores_place_idx on meal_plan_stores(place_id); 