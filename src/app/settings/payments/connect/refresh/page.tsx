import { refreshStripeConnectAction } from "@/app/actions/payments/stripeConnect";
export default async function Page(){await refreshStripeConnectAction();return null}
