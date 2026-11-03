CREATE UNIQUE INDEX uq_members_home_name
ON members (home_id, lower(trim(name)));


SELECT
    home_id,
    lower(trim(name)) AS normalized_name,
    COUNT(*) AS duplicate_count
FROM members
GROUP BY home_id, lower(trim(name))
HAVING COUNT(*) > 1;
