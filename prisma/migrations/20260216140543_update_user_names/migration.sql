-- Update users with null or empty names to use email username
UPDATE "User"
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL OR name = '';
