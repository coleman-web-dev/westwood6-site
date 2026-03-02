-- Drop the problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;

-- Recreate the link function with explicit permissions
CREATE OR REPLACE FUNCTION link_auth_user_to_member()
RETURNS TRIGGER AS $fn$
BEGIN
  UPDATE public.members SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Don't block user creation if linking fails
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the preferences function
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $fn$
BEGIN
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Don't block user creation if preferences fail
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_auth_user_to_member();

CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();
