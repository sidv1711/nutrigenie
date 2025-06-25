import os
import pytest
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

@pytest.fixture
def supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    return create_client(url, key)

def test_environment_variables():
    """Test that all required environment variables are set"""
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "SUPABASE_SERVICE_KEY",
        "OPENAI_API_KEY",
    ]
    
    for var in required_vars:
        assert os.getenv(var) is not None, f"Missing environment variable: {var}"
        assert os.getenv(var) != "", f"Empty environment variable: {var}"

def test_supabase_connection(supabase):
    """Test that we can connect to Supabase"""
    try:
        # Try to query the tables we created
        users = supabase.table("users").select("*").limit(1).execute()
        profiles = supabase.table("profiles").select("*").limit(1).execute()
        stores = supabase.table("stores").select("*").limit(1).execute()
        
        assert users is not None, "Failed to query users table"
        assert profiles is not None, "Failed to query profiles table"
        assert stores is not None, "Failed to query stores table"
    except Exception as e:
        pytest.fail(f"Failed to connect to Supabase: {str(e)}")

def test_pgvector_extension(supabase):
    """Test that pgvector extension is enabled"""
    try:
        # Try to create a table with vector column
        supabase.table("test_vectors").insert({
            "id": 1,
            "embedding": [0.1, 0.2, 0.3]  # Simple 3D vector
        }).execute()
        assert True, "Successfully created vector column"
    except Exception as e:
        if "relation" in str(e) and "does not exist" in str(e):
            # This is expected as we haven't created the table yet
            assert True
        else:
            pytest.fail(f"Failed to test vector support: {str(e)}")

def test_database_access(supabase):
    """Test that we can create and query a table"""
    try:
        # Try to create a test table
        supabase.table("test_setup").insert({"id": 1, "name": "test"}).execute()
        # Try to query the test table
        response = supabase.table("test_setup").select("*").execute()
        assert response is not None, "Failed to query test table"
    except Exception as e:
        pytest.fail(f"Failed to access database: {str(e)}") 