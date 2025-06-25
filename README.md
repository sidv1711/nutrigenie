# 📅 NutriGenie — 8-Week Roadmap  
*Stack: Next.js + Tailwind • FastAPI • Supabase Postgres/pgvector • LangChain • OpenAI GPT-4o*  

---

## 🎯 Goal  
Build a web app that  
1. collects a student's budget, body metrics, fitness goal, dietary prefs, and location  
2. computes daily calories & macros  
3. generates a cost-aware nutrition plan with GPT-4o (fallback open model allowed)  
4. matches ingredients to **one or two** nearby grocery stores using embeddings + price data  
5. returns recipes, macro/cost breakdown, store subtotals, and map links.

Success metric: grocery total ≤ budget (±5 %), meal-prep time ≤ 30 min/day.

---

## Phase 0 – Prep & Discovery (2 days)

| Task | Output |
|------|--------|
| Kickoff & success metrics | Definition-of-Done doc |
| Repo & tooling | GitHub repo, issue labels (`frontend`,`backend`,`scraper`,`prompt`) |
| API keys | OpenAI, Google, Yelp, Spoonacular; Supabase project created |
| Secrets | Stored in GitHub Actions / .env |

---

## Week 1 – Foundation & Auth

| Area | Deliverable | Tools |
|------|-------------|-------|
| Frontend | Next.js skeleton (`/` input, `/dashboard` stub) | `create-next-app`, Tailwind |
| Backend | FastAPI gateway + health-check | `uvicorn`, Pydantic |
| Auth | Email/OAuth with Supabase Auth; RLS scaffolded | Supabase JS |
| DB   | Enable `pgvector`; tables `users`, `profiles`, `stores` | Supabase SQL |

Exit: login round-trip works.

---

## Week 2 – Macro Engine & Core API

* Build `POST /macros` (TDEE via Mifflin-St Jeor, goal multipliers).  
* Update `profiles` row; unit-test with pytest.  
* Wizard step 1 in UI shows macro preview card (React-Hook-Form + zod).

---

## Week 3 – Meal-Plan Generation (GPT-4o)

* Design JSON-schema prompt (`meals`, `grocery_items`, `store_hint`).  
* Use OpenAI **function calling**; auto-reask if Pydantic validation fails.  
* Persist meal plan / ingredient rows.  
* Day-view accordion + macro bars on dashboard.

---

## Week 4 – Store & Price Retriever

* Geocode zip → lat/lon (Google Geocoding).  
* Nearby stores search (Google Places, type =grocery, radius 5 km).  
* Price scrape POC (Instacart/Walmart HTML via BeautifulSoup).  
* Cache to `prices` table (store_id, ingredient_id, price, timestamp).

---

## Week 5 – Embeddings & RAG

* Embed ingredient names with `text-embedding-3-small`; store in `ingredients.embedding`.  
* Add `USING ivfflat` index in pgvector.  
* LangChain `PGVector` retriever (top-k = 5).  
* Chain: **Retrieve → Compress → GPT-4o** ensuring ≤ 2 stores returned.

---

## Week 6 – UI Polish & PDF Export

* Grocery list sections (React Table) with subtotals.  
* Google-Maps deeplink for stores.  
* PDF export via `react-pdf`.  
* Skeleton loaders & error banners.

---

## Week 7 – Beta Launch & Feedback

* Deploy: Vercel (Next.js) + Render (FastAPI) + Supabase.  
* Page analytics (Plausible).  
* Recruit 5 students; compare plan cost to real receipts; log bugs daily.

---

## Week 8 – Cost Optimisation & Open-Model Option

* Token-usage audit (LangSmith/OpenAI dashboard).  
* Free-tier users → GPT-4.1-mini; paid → GPT-4o.  
* Optional fine-tune Llama-3 70 B with LoRA on recipe corpus.  
* Observability: W&B prompt traces; Supabase RLS audit.

---

### 📦 Final Deliverables

1. Production URL + demo creds  
2. Public GitHub repo (MIT or GPL-3)  
3. README + architecture diagram & setup docs  
4. Post-mortem & next-steps backlog (mobile app, meal-prep scheduler)

---

**Next action for the AI:**  
Begin **Phase 0 – Local environment bootstrap**:  
*init git repo, install Node 18 LTS & Python 3.11, create virtualenv, install FastAPI/uvicorn, create Supabase project, enable pgvector.*  
Ask the user to confirm completion before proceeding.