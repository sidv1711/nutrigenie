-- Function to match embeddings using cosine similarity
create or replace function match_embeddings(
    query_embedding vector(3),
    match_threshold float,
    match_count int
)
returns table (
    content text,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        test_embeddings.content,
        1 - (test_embeddings.embedding <=> query_embedding) as similarity
    from test_embeddings
    where 1 - (test_embeddings.embedding <=> query_embedding) > match_threshold
    order by test_embeddings.embedding <=> query_embedding
    limit match_count;
end;
$$; 