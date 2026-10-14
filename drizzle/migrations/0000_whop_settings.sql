CREATE TABLE public.whop_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  api_key text,
  plan_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.whop_settings TO service_role;
ALTER TABLE public.whop_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_whop_settings_updated_at BEFORE UPDATE ON public.whop_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.whop_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;