import os
from dotenv import load_dotenv
from supabase import create_client, Client
import httpx

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

def run_migrations():
    # Get all SQL files from migrations directory
    migration_dir = os.path.join(os.path.dirname(__file__), "migrations")
    migration_files = sorted([f for f in os.listdir(migration_dir) if f.endswith('.sql')])

    # Create a direct connection to the REST API for raw SQL execution
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    for file_name in migration_files:
        print(f"Running migration: {file_name}")
        file_path = os.path.join(migration_dir, file_name)
        
        try:
            with open(file_path, 'r') as f:
                sql = f.read()
                # Execute the SQL using the REST API
                response = httpx.post(
                    f"{supabase_url}/rest/v1/rpc/raw_sql",
                    headers=headers,
                    json={"query": sql}
                )
                response.raise_for_status()
                print(f"Successfully ran migration: {file_name}")
        except Exception as e:
            print(f"Error running migration {file_name}: {str(e)}")
            raise

if __name__ == "__main__":
    run_migrations() 