import type { Metadata } from "next";
import HomeEmptyState from "@/components/home/homeEmptyState";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return <HomeEmptyState />;
}
