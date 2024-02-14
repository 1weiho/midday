import { Cookies } from "@/utils/constants";
import { LogEvents } from "@midday/events/events";
import { logsnag } from "@midday/events/server";
import { createClient } from "@midday/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// export const runtime = "edge";
// export const preferredRegion = "fra1";

export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const client = requestUrl.searchParams.get("client");
  const returnTo = requestUrl.searchParams.get("return_to");
  const provider = requestUrl.searchParams.get("provider");
  const mfaSetupVisited = cookieStore.has(Cookies.MfaSetupVisited);

  if (client === "desktop") {
    return NextResponse.redirect(`${requestUrl.origin}/verify?code=${code}`);
  }

  if (provider) {
    cookieStore.set(Cookies.PrefferedSignInProvider, provider);
  }

  if (code) {
    const supabase = createClient(cookieStore);
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const email = session.user.email;

      await logsnag.track({
        event: LogEvents.SignedIn.name,
        notify: true,
        icon: LogEvents.SignedIn.icon,
        user_id: email,
        channel: LogEvents.SignedIn.channel,
        tags: {
          email,
        },
      });

      await logsnag.identify({
        user_id: session.user.email,
        properties: {
          name: session.user.user_metadata?.full_name,
          email,
        },
      });
    }
  }

  if (!mfaSetupVisited) {
    cookieStore.set(Cookies.MfaSetupVisited, "true");
    return NextResponse.redirect(`${requestUrl.origin}/mfa/setup`);
  }

  if (returnTo) {
    return NextResponse.redirect(`${requestUrl.origin}/${returnTo}`);
  }

  return NextResponse.redirect(requestUrl.origin);
}
