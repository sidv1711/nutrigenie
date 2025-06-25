-- Create a test table with a vector column
create table if not exists public.test_embeddings (
    id serial primary key,
    content text not null,
    embedding vector(3)  -- Using 3D vector for testing
);

-- Insert a test row with a simple embedding
insert into public.test_embeddings (content, embedding)
values (
    'test ingredient',
    '[0.1, 0.2, 0.3]'::vector  -- Simple 3D vector for testing
);

-- Test a simple vector similarity search
select content, embedding <-> '[0.1, 0.2, 0.3]'::vector as distance
from public.test_embeddings
order by distance
limit 1; 