-- Base exclusiva de auth-service. Ejecutar con el propietario PostgreSQL.
-- No utiliza Supabase Auth; las contraseñas se almacenan como Argon2id.
CREATE TABLE IF NOT EXISTS public.users (
    id varchar(64) PRIMARY KEY,
    email varchar(254) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    password_hash varchar(255) NOT NULL,
    role varchar(20) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.sessions (
    token_hash varchar(64) PRIMARY KEY,
    user_id varchar(64) NOT NULL REFERENCES public.users(id),
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON public.sessions(user_id);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.users, public.sessions FROM anon, authenticated;
