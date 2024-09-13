import { SolFeesApp } from "@/components/pages";

import { Metadata } from "next";

export const metadata: Metadata = {
  other: {
    "dscvr:canvas:version": "vNext",
    "og:image": "/next.svg",
  },
};

function HomePage() {
  return (
    <>
      <SolFeesApp />
    </>
  );
}

export { HomePage as default };
