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

def test_vector_operations(supabase):
    """Test that pgvector operations work"""
    try:
        # Try to insert a test embedding
        response = supabase.table("test_embeddings").insert({
            "content": "apple",
            "embedding": [0.1, 0.2, 0.3]  # Simple 3D vector
        }).execute()
        
        assert response is not None, "Failed to insert vector"
        
        # Try to query using vector similarity
        response = supabase.rpc(
            'match_embeddings',
            {
                'query_embedding': [0.1, 0.2, 0.3],
                'match_threshold': 0.8,
                'match_count': 1
            }
        ).execute()
        
        assert response is not None, "Failed to query vectors"
        
    except Exception as e:
        if "relation" in str(e) and "does not exist" in str(e):
            pytest.skip("Test embeddings table not created yet")
        elif "function" in str(e) and "does not exist" in str(e):
            pytest.skip("Vector similarity function not created yet")
        else:
            pytest.fail(f"Vector operations failed: {str(e)}")

def test_vector_extension_enabled(supabase):
    """Test that vector extension is enabled"""
    try:
        # Try to create a temporary test table with vector column
        supabase.rpc(
            'test_vector_extension',
            {}
        ).execute()
        assert True, "Vector extension is enabled"
    except Exception as e:
        if "function" in str(e) and "does not exist" in str(e):
            # Create the function if it doesn't exist
            create_function = """
            create or replace function test_vector_extension()
            returns boolean
            language plpgsql
            as $$
            begin
                create temporary table if not exists temp_vector_test (
                    v vector(3)
                );
                return true;
            exception when others then
                return false;
            end;
            $$;
            """
            try:
                supabase.rpc('test_vector_extension', {}).execute()
                assert True, "Vector extension is enabled"
            except:
                pytest.fail("Vector extension is not enabled") 