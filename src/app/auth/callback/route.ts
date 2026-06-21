import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Route handler OAuth — échange le code d'autorisation contre une session Supabase
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // En cas d'erreur, redirige vers la page de connexion avec un paramètre d'erreur
  return NextResponse.redirect(`${origin}/connexion?erreur=oauth`);
}
