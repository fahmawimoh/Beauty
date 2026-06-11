-- Beauty PostgreSQL database initialization
-- Database: Beauty (created via POSTGRES_DB env var)
-- Extensions and permissions for production-ready EF Core usage.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

GRANT ALL ON SCHEMA public TO beauty;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO beauty;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO beauty;
