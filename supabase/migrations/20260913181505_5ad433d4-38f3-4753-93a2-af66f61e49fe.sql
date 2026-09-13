CREATE TABLE public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1,
  active_image_provider text NOT NULL DEFAULT 'lovable',
  openai_api_key text,
  replicate_api_key text,
  replicate_model text NOT NULL DEFAULT 'black-forest-labs/flux-1.1-pro',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_settings_single_row CHECK (id = 1),
  CONSTRAINT ai_settings_provider_check CHECK (active_image_provider IN ('lovable', 'openai', 'replicate'))
);

GRANT ALL ON public.ai_settings TO service_role;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();