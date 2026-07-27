import Link from "next/link";
import { auth } from "@/auth";
import BrandedAuthLayout from "@/components/branding/BrandedAuthLayout";
import { acceptTeamInvitationAction } from "@/app/actions/teamInvitations/teamInvitations";
import { validateTeamInvitation } from "@/lib/teamInvitations/service";
import PasswordInput from "@/components/forms/PasswordInput";

export default async function JoinCompanyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const [invitation, session] = await Promise.all([validateTeamInvitation(token), auth()]);
  if (invitation.state !== "valid") return <State state={invitation.state} />;
  const signedInAsInvitee = session?.user?.email?.toLowerCase() === invitation.email;
  return <BrandedAuthLayout><div className="auth-card">
    <p className="auth-card__eyebrow">Secure team invitation</p>
    <h1>Join {invitation.companyName}</h1>
    <p className="auth-card__intro">{invitation.existingAccount ? "Connect your existing account to this company." : "Create your password to activate your account."}</p>
    {invitation.existingAccount && !signedInAsInvitee ? <>
      <p className="auth-message">Sign in with {invitation.email} to accept this invitation.</p>
      <Link className="auth-submit block text-center" href={`/sign-in?callbackUrl=${encodeURIComponent(`/join?token=${token}`)}`}>Sign in to continue</Link>
    </> : <form action={acceptTeamInvitationAction}>
      <input type="hidden" name="token" value={token}/>
      {!invitation.existingAccount && <>
        <Field name="firstName" label="First name" autoComplete="given-name"/>
        <Field name="lastName" label="Last name" autoComplete="family-name"/>
        <PasswordInput name="password" label="Create password" autoComplete="new-password" minLength={12} maxLength={128} required wrapperClassName="mt-3"/>
        <PasswordInput name="passwordConfirmation" label="Confirm password" autoComplete="new-password" minLength={12} maxLength={128} required wrapperClassName="mt-3"/>
      </>}
      <button className="auth-submit mt-4">{invitation.existingAccount ? "Join Company" : "Create Password & Join Company"}</button>
    </form>}
  </div></BrandedAuthLayout>;
}

function Field({ label, ...props }: { label: string; name: string; type?: string; autoComplete?: string }) {
  return <label className="auth-field mt-3"><span>{label}</span><input {...props} required /></label>;
}
function State({ state }: { state: "expired" | "revoked" | "accepted" | "invalid" }) {
  const text = state === "expired" ? "This invitation has expired. Ask your company administrator to resend it." : state === "revoked" ? "This invitation was revoked. Contact your company administrator if you still need access." : state === "accepted" ? "This invitation has already been accepted." : "This invitation link is invalid or no longer available.";
  return <BrandedAuthLayout><div className="auth-card"><p className="auth-card__eyebrow">Team invitation</p><h1>Unable to join</h1><p role="alert" className="auth-message">{text}</p><Link className="auth-submit block text-center" href="/sign-in">Go to sign in</Link></div></BrandedAuthLayout>;
}
