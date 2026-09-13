CREATE TABLE public.paddle_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  environment text NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox','production')),
  client_token text,
  api_key text,
  price_id text,
  webhook_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.paddle_settings TO service_role;

ALTER TABLE public.paddle_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_paddle_settings_updated_at
BEFORE UPDATE ON public.paddle_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.paddle_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;