"use server";
import { getSignedPublicEstimatePdf } from "@/lib/estimates/getSignedPublicEstimatePdf";
export async function loadSignedPublicEstimatePdfAction(token: string) { return getSignedPublicEstimatePdf(token); }
