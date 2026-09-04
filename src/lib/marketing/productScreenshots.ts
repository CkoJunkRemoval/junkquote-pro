export const productScreenshots = {
  estimate: {
    src: "/branding/product/estimate-review.png",
    width: 1779,
    height: 884,
    alt: "JunkQuote Pro estimate builder showing itemized junk removal pricing and job cost breakdown",
  },
  approval: {
    src: "/branding/product/estimate-approval.png",
    width: 1774,
    height: 887,
    alt: "JunkQuote Pro estimate delivery screen with email, approval link, on-device signature, and PDF options",
  },
  dispatch: {
    src: "/branding/product/dispatch-board.png",
    width: 1773,
    height: 887,
    alt: "JunkQuote Pro dispatch board showing scheduled junk removal jobs, crews, and job statuses",
  },
} as const;

export type ProductScreenshot = (typeof productScreenshots)[keyof typeof productScreenshots];
