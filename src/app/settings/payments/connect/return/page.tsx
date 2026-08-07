import { returnFromStripeConnectAction } from "@/app/actions/payments/stripeConnect";
export default async function Page(){await returnFromStripeConnectAction();return null}
