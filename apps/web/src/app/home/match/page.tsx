import MatchmakingPage from "@/components/home/matchMaking";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Blend",
};

export default function MatchPage() {
  return <MatchmakingPage />;
}