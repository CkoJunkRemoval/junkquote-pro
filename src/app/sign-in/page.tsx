import SignInForm from "./sign-in-form";
import { safeReturnUrl } from "@/lib/auth/tenant";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) { const params = await searchParams; return <SignInForm callbackUrl={safeReturnUrl(params.callbackUrl)} />; }
